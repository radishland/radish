import { dev } from "$env";
import { Builder } from "./generate/build.ts";
import { UserAgent } from "@std/http/user-agent";
import { App, FileCache, type Handle } from "./server/app.ts";
import type { Config, ManifestBase, ResolvedConfig } from "./types.d.ts";
import { parseArgs } from "@std/cli/parse-args";
import { ManifestController } from "./generate/manifest.ts";
import { globals } from "./constants.ts";
import { ImportMapController } from "./generate/impormap.ts";
import { pluginDefaultPlugins } from "./plugins.ts";

const args = parseArgs(Deno.args, {
  boolean: ["dev", "importmap", "manifest", "build"],
});

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
  if (args.dev) {
    Deno.env.set("dev", "");
  }

  config.plugins = [...(config.plugins ?? []), pluginDefaultPlugins];

  for (const plugin of config.plugins) {
    if (plugin.config) {
      config = plugin.config?.(config, args);
    }
  }

  const resolvedConfig: ResolvedConfig = Object.assign(
    { plugins: [], args },
    config,
  );

  for (const plugin of resolvedConfig.plugins) {
    plugin.configResolved?.(resolvedConfig);
  }

  globals();

  const fileCache = new FileCache();
  const manifestController = new ManifestController(
    resolvedConfig.plugins,
    loadManifest,
    fileCache,
  );

  if (args.manifest) {
    manifestController.createManifest();
    manifestController.write();
  } else {
    const manifest = await manifestController.reloadManifest();
    const importmapController = new ImportMapController(
      fileCache,
      resolvedConfig.importmap,
    );
    const builder = new Builder(
      resolvedConfig.plugins,
      manifest,
      importmapController,
      fileCache,
    );

    if (args.importmap) {
      const importmap = await importmapController.generate(manifest);
      await Deno.writeTextFile(importmapController.path, importmap);
    } else if (args.build) {
      await builder.build();
    } else {
      new App({
        config: resolvedConfig,
        manifestController,
        importmapController,
        builder,
        handle,
        fileCache,
      });
    }
  }
}
