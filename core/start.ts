import {
  build,
  config as configEffect,
  env,
  fs,
  importmap,
  manifest,
  router,
  server,
} from "$effects/mod.ts";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "$lib/conventions.ts";
import { dev } from "$lib/environment.ts";
import { globals } from "$lib/globals.ts";
import * as effects from "@radish/effect-system";
import { parseArgs } from "@std/cli";
import { serveDir } from "@std/http";
import { join } from "@std/path";
import { generateImportmap } from "./plugins/importmap/importmap.ts";
import type { CLIArgs, Config } from "./types.d.ts";

const cliArgs: CLIArgs = Object.freeze(parseArgs(Deno.args, {
  boolean: ["dev", "env", "importmap", "manifest", "build", "server"],
}));

export async function startApp(config: Config) {
  config = await configEffect.transform({ ...config, args: cliArgs });
  const resolvedConfig: Config = Object.freeze(config);

  effects.addHandler(
    effects.handlerFor(configEffect.read, () => resolvedConfig),
  );

  globals();

  if (cliArgs.env) {
    await env.load();
  }

  await manifest.load();

  if (cliArgs.manifest) {
    console.log("Generating manifest...");
    await manifest.updateEntries(
      `+(${libFolder}|${elementsFolder}|${routesFolder})/**`,
    );
    await manifest.write();
  }

  if (cliArgs.importmap) {
    await generateImportmap();
    await importmap.write();
  }

  if (cliArgs.build) {
    console.log("Building...");
    if (await fs.exists(buildFolder)) {
      await fs.remove(buildFolder);
    }
    await build.files(`+(${libFolder}|${elementsFolder}|${routesFolder})/**`);
  }

  if (cliArgs.server) {
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
        onRequest: async ({ request }) => {
          return await serveDir(request, { fsRoot });
        },
      });
    }

    await server.start(config.server);
  }
}
