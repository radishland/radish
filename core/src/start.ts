import { build } from "$effects/build.ts";
import { env } from "$effects/env.ts";
import { importmap } from "$effects/importmap.ts";
import { manifest } from "$effects/manifest.ts";
import * as effects from "@radish/effect-system";
import { parseArgs } from "@std/cli";
import { UserAgent } from "@std/http";
import {
  elementsFolder,
  globals,
  libFolder,
  routesFolder,
} from "./constants.ts";
import { config as configEffect } from "./effects/config.ts";
import { dev } from "./environment.ts";
import { generateImportmap } from "./plugins/importmap/importmap.ts";
import { updateManifest } from "./plugins/manifest/manifest.ts";
import { createApp, type Handle } from "./server/app.ts";
import type { CLIArgs, Config, ResolvedConfig } from "./types.d.ts";

const cliArgs: CLIArgs = Object.freeze(parseArgs(Deno.args, {
  boolean: ["dev", "env", "importmap", "manifest", "build", "server"],
}));

const handle: Handle = async ({ context, resolve }) => {
  // Avoid mime type sniffing
  context.headers.set("X-Content-Type-Options", "nosniff");

  if (!dev) {
    const ua = new UserAgent(context.request.headers.get("user-agent") ?? "");
    console.log("ua:", ua);
  }

  return await resolve(context);
};

export async function startApp(
  config: Config,
  getManifest: () => Promise<any>,
) {
  const handlers = config.plugins?.flatMap((plugin) => plugin.handlers) ?? [];
  using _ = new effects.HandlerScope(...handlers);

  config = await configEffect.transform(config);

  const resolvedConfig: ResolvedConfig = Object.freeze(
    Object.assign({}, { args: cliArgs, ...config }),
  );

  effects.addHandlers([
    effects.handlerFor(configEffect.read, () => resolvedConfig),
  ]);

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

  if (cliArgs.importmap || cliArgs.build) {
    await manifest.setLoader(getManifest);
    await manifest.load();

    if (cliArgs.importmap) {
      await generateImportmap();
      await importmap.write();
    }

    if (cliArgs.build) {
      await build.start([
        `${libFolder}/**`,
        `${elementsFolder}/**`,
        `${routesFolder}/**`,
      ]);
    }
  }

  if (cliArgs.server) {
    await createApp(handle);
  }
}
