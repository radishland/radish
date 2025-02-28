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
        .replace("radish/parser", "@radish/htmlcrunch")
        .replace("radish/utils", "@radish/core/utils")
        .replace(/[^@]radish[^/]/, '"@radish/core"');
    },
  });
} else {
  mockGlobals();
  const { manifest } = await import("../_generated/manifest.ts") as {
    manifest: Manifest;
  };

  if (args.includes("--importmap")) {
    await generateImportMap(manifest, {
      install: "@radishland/runtime@^0.1.0/boot",
      transform: (importmap) => {
        return JSON.stringify({
          imports: {
            ...importmap.imports,
            // When using the development runtime version
            // "radish": "/_radish/runtime/index.js",
          },
          scopes: importmap.scopes,
        });
      },
    });
  } else if (args.includes("--build")) {
    await build(manifest, { dev: false });
  }
}
