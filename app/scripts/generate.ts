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
        !dev() && "@shoelace-style/shoelace/dist/components/rating/rating.js",
      ],
      transform: (importmap) => {
        const imports = {
          // When using the development runtime version
          "radish": "/_radish/runtime/index.js",
          "radish/boot": "/_radish/runtime/boot.js",
        };
        return JSON.stringify({
          imports: { ...importmap.imports, ...imports },
          scopes: { ...importmap.scopes },
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
