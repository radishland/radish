import {
  build,
  generateImportMap,
  generateManifest,
  Manifest,
  mockGlobals,
} from "@radish/core";

const args = Deno.args;

if (args.includes("--manifest")) {
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
    await generateImportMap(manifest, {
      // When using the development runtime version
      install: "@preact/signals-core",
      transform: (importmap) => {
        return JSON.stringify({
          imports: {
            ...importmap.imports,
            // When using the development runtime version
            "radish": "/_radish/runtime/index.js",
            "radish/boot": "/_radish/runtime/boot.js",
          },
          scopes: importmap.scopes,
        });
      },
    });
  } else if (args.includes("--build")) {
    await build(manifest, { dev: false });
  }
}
