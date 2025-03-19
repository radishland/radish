import { build, generateImportMap, Manifest } from "@radish/core";
import { dev } from "@radish/core/env";

const args = Deno.args;

if (args.includes("--dev")) {
  Deno.env.set("dev", "");
  console.log(`Running in dev mode`);
}

const { manifest } = await import("../_generated/manifest.ts") as {
  manifest: Manifest;
};
if (args.includes("--importmap")) {
  // Importmap section

  await generateImportMap(manifest, {
    install: [
      "@preact/signals-core", // When using the development runtime version
      "@material/web/button/filled-button",
      "@material/web/button/outlined-button",
      "@material/web/checkbox/checkbox",
      "wired-elements",
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

  build(manifest, {
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
