import { io } from "$effects/io.ts";
import { manifest } from "$effects/manifest.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertExists, assertObjectMatch } from "@std/assert";
import type { WalkEntry } from "@std/fs";
import { basename } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import {
  handleManifestGet,
  handleManifestUpdateExtractImports,
  handleManifestUpdateTerminal,
} from "./manifest.ts";

const createWalkEntry = (path: string): WalkEntry => {
  return {
    isDirectory: false,
    isFile: true,
    path,
    name: basename(path),
    isSymlink: false,
  };
};

describe("manifest", () => {
  test("manifest/update extracts imports", async () => {
    const files: Record<string, string> = {
      "lib/a.ts": `import a from "b.ts";`,
      "lib/b.js": `import a from "c.js";`,
      "elements/my-alert.ts": ``,
      "elements/my-button.ts": ``,
      "elements/my-carousel.ts": ``,
      "elements/folder": ``,
    };

    using _ = new HandlerScope(
      handlerFor(io.read, (path) => {
        const content = files[path];
        assertExists(content);
        return content;
      }),
      handleManifestGet,
      handleManifestUpdateExtractImports,
      handleManifestUpdateTerminal,
    );

    for (const path of Object.keys(files)) {
      await manifest.update(createWalkEntry(path));
    }

    const manifestObject = await manifest.get();

    assertObjectMatch(manifestObject, {
      imports: {
        "lib/a.ts": ["b.ts"],
        "lib/b.js": ["c.js"],
        "elements/my-alert.ts": [],
        "elements/my-button.ts": [],
        "elements/my-carousel.ts": [],
      },
    });
  });
});
