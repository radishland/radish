import {
  build,
  generateManifest,
  importMap,
  type Manifest,
  mockGlobals,
} from "radish";

const args = Deno.args;

if (args.includes("--manifest")) {
  generateManifest();
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
