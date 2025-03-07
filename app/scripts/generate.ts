import {
  build,
  generateImportMap,
  generateManifest,
  Manifest,
  mockGlobals,
} from "@radish/core";
import { dev } from "@radish/core/env";

const args = Deno.args;

if (args.includes("--dev")) {
  Deno.env.set("dev", "");
  console.log(`Running in dev mode`);
}

if (args.includes("--manifest")) {
  // Manifest section

  generateManifest({
    transform: (content) => {
      return content
        .replace("$core/parser", "@radish/htmlcrunch")
        .replace("$core/utils", "@radish/core/utils")
        .replace("$core", "@radish/core");
    },
  });
} else {
  mockGlobals();
  const { manifest } = await import("../_generated/manifest.ts") as {
    manifest: Manifest;
  };
  if (args.includes("--importmap")) {
    // Importmap section

    await generateImportMap(manifest, {
      install: [
        "@preact/signals-core", // When using the development runtime version
      ],
      generatorOptions: {
        inputMap: {
          imports: {
            "@shoelace-style/shoelace/dist/components/rating/rating.js": dev()
              ? "../node_modules/@shoelace-style/shoelace/dist/components/rating/rating.js"
              : "@shoelace-style/shoelace/dist/components/rating/rating.js",
          },
          scopes: {
            "https://ga.jspm.io/": {
              "@lit/reactive-element":
                "https://ga.jspm.io/npm:@lit/reactive-element@2.0.4/reactive-element.js",
              "@lit/reactive-element/decorators/":
                "https://ga.jspm.io/npm:@lit/reactive-element@2.0.4/decorators/",
              "@shoelace-style/localize":
                "https://ga.jspm.io/npm:@shoelace-style/localize@3.2.1/dist/index.js",
              "lit": "https://ga.jspm.io/npm:lit@3.2.1/index.js",
              "lit-element/lit-element.js":
                "https://ga.jspm.io/npm:lit-element@4.1.1/lit-element.js",
              "lit-html": "https://ga.jspm.io/npm:lit-html@3.2.1/lit-html.js",
              "lit-html/": "https://ga.jspm.io/npm:lit-html@3.2.1/",
              "lit/": "https://ga.jspm.io/npm:lit@3.2.1/",
            },
          },
        },
        ignore: ["@shoelace-style/shoelace/dist/components/rating/rating.js"],
      },
      transform: (importmap) => {
        const insert = {
          // When using the development runtime version
          "radish": "/_radish/runtime/index.js",
          "radish/boot": "/_radish/runtime/boot.js",
        };
        return JSON.stringify({
          imports: { ...importmap.imports, ...insert },
          scopes: importmap.scopes,
        });
      },
    });
  } else if (args.includes("--build")) {
    // Build section

    await build(manifest, {
      // speculationRules: {
      //   prerender: [{
      //     where: {
      //       and: [
      //         { href_matches: "/*" },
      //         { not: { selector_matches: ".do-not-prerender" } },
      //       ],
      //     },
      //     eagerness: "moderate",
      //   }],
      //   prefetch: [
      //     {
      //       where: { not: { href_matches: "/*" } },
      //       eagerness: "moderate",
      //     },
      //   ],
      // },
    });
  }
}
