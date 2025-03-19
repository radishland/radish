import { generateImportMap, type Manifest, setGlobals } from "$core";

const args = Deno.args;

if (args.includes("--dev")) {
  Deno.env.set("dev", "");
  console.log(`Running in dev mode`);
}

setGlobals();
const { manifest } = await import("../_generated/manifest.ts") as {
  manifest: Manifest;
};

if (args.includes("--importmap")) {
  await generateImportMap(manifest, {
    install: "@radishland/runtime@^0.1.0/boot",
  });
}
