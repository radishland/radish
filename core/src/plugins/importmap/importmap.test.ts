import { assertEquals } from "@std/assert/equals";
import { describe, test } from "@std/testing/bdd";
import { pluginImportmap, pureImportMap } from "./importmap.ts";
import { handlerFor, runWith } from "@radish/effect-system";
import { io } from "../../effects/io.ts";
import { importmapPath } from "../../../exports/mod.ts";
import { dirname, fromFileUrl, join } from "@std/path";
import { id } from "../../utils/algebraic-structures.ts";

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
  test("transforms index.html files", () => {
    runWith(async () => {
      const input = await Deno.readTextFile(
        join(moduleDir, "testdata", "input.html"),
      );

      const output = await Deno.readTextFile(
        join(moduleDir, "testdata", "output.nofmt.html"),
      );

      const { content } = await io.transformFile({
        path: "_app.html",
        content: input,
      });

      assertEquals(content, output);
    }, [
      ...pluginImportmap.handlers,
      handlerFor(io.readFile, async (path) => {
        if (path === importmapPath) {
          return await Deno.readTextFile(
            join(moduleDir, "testdata", "importmap.json"),
          );
        }
        return "";
      }),
      handlerFor(io.transformFile, id),
    ]);
  });
});
