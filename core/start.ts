import {
  build,
  config as configEffect,
  env,
  hmr,
  importmap,
  manifest,
  router,
  server,
} from "$effects/mod.ts";
import * as effects from "@radish/effect-system";
import { parseArgs } from "@std/cli";
import { serveDir } from "@std/http";
import { join } from "@std/path";
import {
  buildFolder,
  elementsFolder,
  globals,
  libFolder,
  routesFolder,
  staticFolder,
} from "./constants.ts";
import { dev } from "./environment.ts";
import { generateImportmap } from "./plugins/importmap/importmap.ts";
import { updateManifest } from "./plugins/manifest/manifest.ts";
import { SERVER_DEFAULTS } from "./plugins/server/mod.ts";
import type { CLIArgs, Config } from "./types.d.ts";
import { onDispose } from "./mod.ts";

const cliArgs: CLIArgs = Object.freeze(parseArgs(Deno.args, {
  boolean: ["dev", "env", "importmap", "manifest", "build", "server"],
}));

export async function startApp(
  config: Config,
  getManifest: () => Promise<any>,
) {
  const plugins = config.plugins ?? [];
  const scope = new effects.HandlerScope(...plugins);
  onDispose(async () => await scope[Symbol.asyncDispose]());

  config = await configEffect.transform({ ...config, args: cliArgs });
  const resolvedConfig: Config = Object.freeze(config);

  effects.addHandlers(
    effects.handlerFor(configEffect.read, () => resolvedConfig),
  );

  globals();

  if (cliArgs.env) {
    await env.load();
  }

  if (cliArgs.manifest) {
    console.log("Generating manifest...");
    await updateManifest("**", { root: libFolder });
    await updateManifest("**", { root: elementsFolder });
    await updateManifest("**", { root: routesFolder });
    await manifest.write();
  }

  if (cliArgs.importmap) {
    await manifest.setLoader(getManifest);
    await manifest.load();
    await generateImportmap();
    await importmap.write();
  }

  if (cliArgs.build) {
    await manifest.setLoader(getManifest);
    await manifest.load();

    await build.start([
      `${libFolder}/**`,
      `${elementsFolder}/**`,
      `${routesFolder}/**`,
    ]);
  }

  if (cliArgs.server) {
    await manifest.setLoader(getManifest);
    await manifest.load();
    await router.init();

    const staticRoutes: [string, string][] = [
      [routesFolder, buildFolder],
      [elementsFolder, buildFolder],
      [libFolder, buildFolder],
      [staticFolder, "."],
      dev
        ? [`/node_modules/*`, join(config.router?.nodeModulesRoot ?? ".")]
        : ["", ""],
    ];

    for (const [folder, fsRoot] of staticRoutes) {
      if (!folder || !fsRoot) continue;

      await router.addRoute({
        method: "GET",
        pattern: new URLPattern({ pathname: `/${folder}/*` }),
        handleRoute: async ({ request }) => {
          return await serveDir(request, { fsRoot });
        },
      });
    }

    await server.start({ ...SERVER_DEFAULTS, ...config.server });

    if (dev) await hmr.start();
  }
}
