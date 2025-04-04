import { assertEquals } from "@std/assert/equals";
import { pureImportMap } from "../src/generate/impormap.ts";

Deno.test("main import", () => {
  const importmap = pureImportMap(
    { imports: { "a": ["kleur"] } },
    { "kleur": "npm:kleur@4.1.5" },
  );

  assertEquals(importmap.imports, {
    kleur: "https://esm.sh/kleur@4.1.5/",
  });
});

Deno.test("subpath import", () => {
  const importmap = pureImportMap({
    imports: { a: ["kleur/colors"] },
  }, {
    "kleur": "npm:kleur@4.1.5",
  });

  assertEquals(importmap.imports, {
    "kleur/colors": "https://esm.sh/kleur@4.1.5/colors",
  });
});

Deno.test("main & subpath imports", () => {
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

Deno.test("filters unused packages", () => {
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

Deno.test("aliased relative import", () => {
  const importmap = pureImportMap({
    imports: { a: ["$alias"] },
  }, {
    "$alias": "./my-module.js",
  });

  assertEquals(importmap.imports, {
    "$alias": "/my-module.js",
  });
});

Deno.test("rewrite aliased relative ts import", () => {
  const importmap = pureImportMap({
    imports: { a: ["$alias"] },
  }, {
    "$alias": "./lib/my-module.ts",
  });

  assertEquals(importmap.imports, {
    "$alias": "/lib/my-module.js",
  });
});

Deno.test("https target", () => {
  const importmap = pureImportMap({
    imports: { a: ["$alias"] },
  }, {
    "$alias": "https://raw.githubusercontent.com/package/module.js",
  });

  assertEquals(importmap.imports, {
    "$alias": "https://raw.githubusercontent.com/package/module.js",
  });
});
