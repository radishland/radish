import { assertEquals } from "@std/assert/equals";
import { describe, test } from "@std/testing/bdd";
import {
  findLongestMatchingPrefix,
  pureImportMap,
} from "../src/effects/importmap.ts";
import { assertObjectMatch } from "@std/assert";

Deno.test("findLongestMatchingPrefix", () => {
  const cases: {
    args: [specifier: string, prefixes: string[]];
    result: ReturnType<typeof findLongestMatchingPrefix>;
  }[] = [
    { args: ["a", []], result: { path: "", prefix: undefined } },
    // Equality
    { args: ["a", ["a"]], result: { path: "", prefix: "a" } },
    // Proper subpath prefix
    { args: ["a/b", ["a"]], result: { path: "/b", prefix: "a" } },
    { args: ["a/b", ["a/"]], result: { path: "b", prefix: "a/" } },
    // Longest match
    { args: ["a/b", ["a", "a/b"]], result: { path: "", prefix: "a/b" } },
    // Matches subpath prefixes only
    { args: ["ab", ["a"]], result: { path: "", prefix: undefined } },
  ];

  for (const values of cases) {
    const result = findLongestMatchingPrefix(...values.args);
    assertObjectMatch(result, values.result);
  }
});

describe("Importmap", () => {
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
