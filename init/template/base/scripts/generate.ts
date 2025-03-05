import {
  build,
  generateImportMap,
  generateManifest,
  type Manifest,
  mockGlobals,
} from "$core";

const args = Deno.args;

if (args.includes("--dev")) {
  Deno.env.set("dev", "");
  console.log(`Running in dev mode`);
}

if (args.includes("--manifest")) {
  generateManifest();
} else {
  mockGlobals();
  const { manifest } = await import("../_generated/manifest.ts") as {
    manifest: Manifest;
  };

  if (args.includes("--importmap")) {
    await generateImportMap(manifest, {
      install: "@radishland/runtime@^0.1.0/boot",
    });
  } else if (args.includes("--build")) {
    await build(manifest, {
      speculationRules: {
        prerender: [{
          where: {
            and: [
              { href_matches: "/*" },
              { not: { href_matches: "/logout" } },
              { not: { href_matches: "/add-to-cart" } },
              { not: { selector_matches: ".do-not-prerender" } },
            ],
          },
          eagerness: "moderate",
        }],
        prefetch: [
          {
            where: { not: { href_matches: "/*" } },
            eagerness: "moderate",
          },
        ],
      },
    });
  }
}
