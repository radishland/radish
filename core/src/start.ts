import { dev } from "$env";
import { UserAgent } from "@std/http/user-agent";
import { App, FileCache, type Handle } from "./server/app.ts";
import type { Config, ManifestBase, ResolvedConfig } from "./types.d.ts";
import { parseArgs } from "@std/cli/parse-args";
import { ManifestController } from "./generate/manifest.ts";
import { globals } from "./constants.ts";
import { ImportMapController } from "./generate/impormap.ts";
import { pluginDefaultPlugins } from "./plugins.ts";
import { build } from "./generate/build.ts";
import { perform } from "./effects/registry.ts";
import { modifyConfig, readConfig } from "./effects/operations.ts";
import * as effects from "./effects/registry.ts";

const denoArgs = Object.freeze(parseArgs(Deno.args, {
  boolean: ["dev", "importmap", "manifest", "build"],
}));

export type DenoArgs = typeof denoArgs;

const handle: Handle = async ({ context, resolve }) => {
  // Avoid mime type sniffing
  context.headers.set("X-Content-Type-Options", "nosniff");

  if (!dev()) {
    const ua = new UserAgent(context.request.headers.get("user-agent") ?? "");
    console.log("ua:", ua);
  }

  return await resolve(context);
};

export async function startApp(
  loadManifest: () => Promise<ManifestBase>,
  config: Config = {},
) {
  if (denoArgs.dev) {
    Deno.env.set("dev", "");
  }

  config.plugins = [...(config.plugins ?? []), pluginDefaultPlugins];

  perform(modifyConfig, { config, args: denoArgs });

  const resolvedConfig: ResolvedConfig = Object.assign(
    { plugins: [], args: denoArgs },
    config,
  );
  Object.freeze(resolvedConfig);

  effects.addHandler(readConfig, () => {
    return resolvedConfig;
  });

  globals();

  const fileCache = new FileCache();
  const manifestController = new ManifestController(
    resolvedConfig.plugins,
    loadManifest,
    fileCache,
  );

  if (denoArgs.manifest) {
    manifestController.createManifest();
    manifestController.write();
  } else {
    const manifest = await manifestController.load();
    const importmapController = new ImportMapController(
      fileCache,
      resolvedConfig.importmap,
    );

    if (denoArgs.importmap) {
      const importmap = await importmapController.generate(manifest);
      await Deno.writeTextFile(importmapController.path, importmap);
    } else if (denoArgs.build) {
      await build();
    } else {
      new App({
        config: resolvedConfig,
        manifestController,
        importmapController,
        handle,
        fileCache,
      });
    }
  }
}
