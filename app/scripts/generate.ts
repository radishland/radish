import {
  build,
  generateManifest,
  importMap,
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
    await importMap(manifest, {
      install: ["signal-polyfill@^0.2.2"],
    });
  } else if (args.includes("--build")) {
    await build(manifest, { dev: false });
  }
}
