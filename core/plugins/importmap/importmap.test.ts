import { fs } from "$effects/fs.ts";
import { importmapPath } from "$effects/importmap.ts";
import { build } from "$effects/mod.ts";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { pluginFS } from "../mod.ts";
import { pluginImportmap, pureImportMap } from "./importmap.ts";

describe("pure importmap", () => {
  test("main import", () => {
    const importmap = pureImportMap(
      { imports: { "a": ["kleur"] } },
      { "kleur": "npm:kleur@4.1.5" },
    );

    assertEquals(importmap.imports, {
      kleur: "https://esm.sh/kleur@4.1.5/",
    });
  });

  test("subpath import", () => {
    const importmap = pureImportMap({
      imports: { a: ["kleur/colors"] },
    }, {
      "kleur": "npm:kleur@4.1.5",
    });

    assertEquals(importmap.imports, {
      "kleur/colors": "https://esm.sh/kleur@4.1.5/colors",
    });
  });

  test("main & subpath imports", () => {
    const importmap = pureImportMap({
      imports: { a: ["kleur"], b: ["kleur/colors"] },
    }, {
      "kleur": "npm:kleur@4.1.5",
    });

    assertEquals(importmap.imports, {
      "kleur/colors": "https://esm.sh/kleur@4.1.5/colors",
      kleur: "https://esm.sh/kleur@4.1.5/",
    });
  });

  test("filters unused packages", () => {
    const importmap = pureImportMap({
      imports: { a: ["kleur"] },
    }, {
      "kleur": "npm:kleur@4.1.5",
      "shell-quote": "npm:shell-quote@1.8.0",
    });

    assertEquals(importmap.imports, {
      kleur: "https://esm.sh/kleur@4.1.5/",
    });
  });

  test("aliased relative import", () => {
    const importmap = pureImportMap({
      imports: { a: ["$alias"] },
    }, {
      "$alias": "./my-module.js",
    });

    assertEquals(importmap.imports, {
      "$alias": "/my-module.js",
    });
  });

  test("rewrite aliased relative ts import", () => {
    const importmap = pureImportMap({
      imports: { a: ["$alias"] },
    }, {
      "$alias": "./lib/my-module.ts",
    });

    assertEquals(importmap.imports, {
      "$alias": "/lib/my-module.js",
    });
  });

  test("https target", () => {
    const importmap = pureImportMap({
      imports: { a: ["$alias"] },
    }, {
      "$alias": "https://raw.githubusercontent.com/package/module.js",
    });

    assertEquals(importmap.imports, {
      "$alias": "https://raw.githubusercontent.com/package/module.js",
    });
  });
});

const moduleDir = dirname(fromFileUrl(import.meta.url));

describe("importmap generation", () => {
  test("transforms index.html files", async () => {
    using _ = new HandlerScope(
      pluginImportmap,
      handlerFor(fs.read, async (path) => {
        if (path === importmapPath) {
          return await Deno.readTextFile(
            join(moduleDir, "testdata", "importmap.json"),
          );
        }
        return Handler.continue(path);
      }),
      pluginFS,
      handlerFor(build.transform, (_, content) => content),
    );

    const input = await fs.read(join(moduleDir, "testdata", "input.html"));
    const output = await fs.read(
      join(moduleDir, "testdata", "output.nofmt.html"),
    );

    const content = await build.transform("_app.html", input);

    assertEquals(content, output);
  });
});
