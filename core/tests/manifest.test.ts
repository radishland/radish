import { assertEquals, assertExists } from "@std/assert";
import type { WalkEntry } from "@std/fs";
import { basename, extname, relative } from "@std/path";
import { handlerFor, io } from "../exports/effects.ts";
import { runWith } from "../src/effects/effects.ts";
import { manifest } from "../src/effects/manifest.ts";
import type { ElementManifest } from "../src/plugins/render/render.ts";
import type { ManifestBase } from "../src/types.d.ts";
import { id } from "../src/utils/algebraic-structures.ts";
import { extractImports } from "../src/utils/parse.ts";
import { Handler } from "../src/effects/handlers.ts";

const files: Record<string, string> = {
  "lib/a.ts": `import a from "b.ts";`,
  "lib/b.js": `import a from "b.js";`,
  "elements/my-alert.ts": ``,
  "elements/my-button.ts": ``,
  "elements/my-carousel.ts": ``,
  "elements/folder": ``,
};

let manifestObject: ManifestBase = { imports: {} };

const createWalkEntry = (path: string): WalkEntry => {
  return {
    isDirectory: false,
    isFile: true,
    path,
    name: basename(path),
    isSymlink: false,
  };
};

runWith(async () => {
  for (const path of Object.keys(files)) {
    const { manifestObject: newManifest } = await manifest.update({
      entry: createWalkEntry(path),
      manifestObject,
    });
    manifestObject = newManifest;
  }
}, [
  handlerFor(io.readFile, (path) => {
    const content = files[path];
    assertExists(content);
    return content;
  }),
  handlerFor(manifest.update, async (
    { entry, manifestObject },
  ) => {
    if (entry.isFile && [".ts"].includes(extname(entry.path))) {
      const content = await io.readFile(entry.path);
      const imports = extractImports(content);
      manifestObject.imports[entry.path] = imports;
    }

    return Handler.continue({ entry, manifestObject });
  }),
  handlerFor(manifest.update, (
    { entry, manifestObject },
  ) => {
    manifestObject = Object.assign({
      elements: {},
      routes: {},
      layouts: {},
    }, manifestObject);

    if (
      entry.path.includes("-") &&
      !relative("elements", entry.path).startsWith("..")
    ) {
      const name = basename(entry.path);
      const elementMetaData: ElementManifest = {
        kind: "element",
        tagName: name,
        path: entry.path,
        files: [],
      };

      manifestObject.elements[name] = elementMetaData;
    }

    return Handler.continue({ entry, manifestObject });
  }),
  handlerFor(manifest.update, id),
]);

Deno.test("manifest", () => {
  assertEquals(manifestObject, {
    imports: {
      "lib/a.ts": ["b.ts"],
      "elements/my-alert.ts": [],
      "elements/my-button.ts": [],
      "elements/my-carousel.ts": [],
    },
    elements: {
      "my-alert.ts": {
        files: [],
        kind: "element",
        path: "elements/my-alert.ts",
        tagName: "my-alert.ts",
      },
      "my-button.ts": {
        files: [],
        kind: "element",
        path: "elements/my-button.ts",
        tagName: "my-button.ts",
      },
      "my-carousel.ts": {
        files: [],
        kind: "element",
        path: "elements/my-carousel.ts",
        tagName: "my-carousel.ts",
      },
    },
    routes: {},
    layouts: {},
  });
});
