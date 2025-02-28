import {
  build,
  generateManifest,
  importMap,
  type Manifest,
  mockGlobals,
} from "radish/core";

const args = Deno.args;

if (args.includes("--manifest")) {
  generateManifest();
} else {
  mockGlobals();
  const { manifest } = await import("../_generated/manifest.ts") as {
    manifest: Manifest;
  };

  if (args.includes("--importmap")) {
    await importMap(manifest);
  } else if (args.includes("--build")) {
    await build(manifest, { dev: false });
  }
}
