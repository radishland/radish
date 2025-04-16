import { dev } from "$env";
import { parseArgs } from "@std/cli/parse-args";
import { UserAgent } from "@std/http/user-agent";
import { globals } from "./constants.ts";
import { config as configEffect } from "./effects/config.ts";
import * as effects from "./effects/effects.ts";
import { generateImportmap, importmap } from "./effects/impormap.ts";
import { manifest, updateManifest } from "./effects/manifest.ts";
import { build } from "./effects/build.ts";
import { App, type Handle } from "./server/app.ts";
import type { Config, ResolvedConfig } from "./types.d.ts";

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

export async function startApp(config: Config = {}) {
  if (denoArgs.dev) {
    Deno.env.set("dev", "");
  }

  for (const plugin of config.plugins ?? []) {
    if (plugin.handlers) {
      effects.addHandlers(plugin.handlers);
    }
    if (plugin.transformers) {
      effects.addTransformers(plugin.transformers);
    }
  }

  config = await configEffect.transform(config);

  const resolvedConfig: ResolvedConfig = Object.freeze(
    Object.assign({}, { args: denoArgs, ...config }),
  );

  effects.addHandlers([
    effects.handlerFor(configEffect.read, () => resolvedConfig),
  ]);

  globals();

  if (denoArgs.manifest) {
    await updateManifest();
    await manifest.write();
  } else {
    await manifest.load();

    if (denoArgs.importmap) {
      await generateImportmap();
      await importmap.write();
    } else if (denoArgs.build) {
      await build();
    } else {
      new App({ handle });
    }
  }
}
