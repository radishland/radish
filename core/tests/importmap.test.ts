import { assertEquals } from "@std/assert/equals";
import { pureImportMap } from "../src/generate/impormap.ts";
import type { ElementManifest } from "../src/generate/manifest.ts";

const zeroElement = {
  kind: "custom-element",
  class: class {},
  dependencies: [],
  imports: [],
  path: [],
  tagName: "",
} satisfies ElementManifest;

Deno.test("main import", async () => {
  const importmap = await pureImportMap({
    elements: {
      a: {
        ...zeroElement,
        imports: ["kleur"],
      },
    },
    routes: {},
  }, {
    "kleur": "npm:kleur@4.1.5",
  });

  assertEquals(importmap, {
    imports: {
      kleur: "https://ga.jspm.io/npm:kleur@4.1.5/index.mjs",
    },
  });
});

Deno.test("subpath import", async () => {
  const importmap = await pureImportMap({
    elements: {
      a: {
        ...zeroElement,
        imports: ["kleur/colors"],
      },
    },
    routes: {},
  }, {
    "kleur": "npm:kleur@4.1.5",
  });

  assertEquals(importmap, {
    imports: {
      "kleur/colors": "https://ga.jspm.io/npm:kleur@4.1.5/colors.mjs",
    },
  });
});

Deno.test("main & subpath imports", async () => {
  const importmap = await pureImportMap({
    elements: {
      a: {
        ...zeroElement,
        imports: ["kleur"],
      },
      b: {
        ...zeroElement,
        imports: ["kleur/colors"],
      },
    },
    routes: {},
  }, {
    "kleur": "npm:kleur@4.1.5",
  });

  assertEquals(importmap, {
    imports: {
      kleur: "https://ga.jspm.io/npm:kleur@4.1.5/index.mjs",
      "kleur/colors": "https://ga.jspm.io/npm:kleur@4.1.5/colors.mjs",
    },
  });
});

Deno.test("filters unused packages", async () => {
  const importmap = await pureImportMap({
    elements: {
      a: {
        ...zeroElement,
        imports: ["kleur"],
      },
    },
    routes: {},
  }, {
    "kleur": "npm:kleur@4.1.5",
    "shell-quote": "npm:shell-quote@1.8.0",
  });

  assertEquals(importmap, {
    imports: {
      kleur: "https://ga.jspm.io/npm:kleur@4.1.5/index.mjs",
    },
  });
});

Deno.test("aliased relative import", async () => {
  const importmap = await pureImportMap({
    elements: {
      a: {
        ...zeroElement,
        imports: ["$alias"],
      },
    },
    routes: {},
  }, {
    "$alias": "./my-module.js",
  });

  assertEquals(importmap, {
    imports: {
      "$alias": "./my-module.js",
    },
  });
});

Deno.test("rewrite aliased relative ts import", async () => {
  const importmap = await pureImportMap({
    elements: {
      a: {
        ...zeroElement,
        imports: ["$alias"],
      },
    },
    routes: {},
  }, {
    "$alias": "./lib/my-module.ts",
  });

  assertEquals(importmap, {
    imports: {
      "$alias": "./lib/my-module.js",
    },
  });
});

Deno.test("https target", async () => {
  const importmap = await pureImportMap({
    elements: {
      a: {
        ...zeroElement,
        imports: ["$alias"],
      },
    },
    routes: {},
  }, {
    "$alias": "https://raw.githubusercontent.com/package/module.js",
  });

  assertEquals(importmap, {
    imports: {
      "$alias": "https://raw.githubusercontent.com/package/module.js",
    },
  });
});
