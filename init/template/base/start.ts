import type { Config } from "@radish/core";
import { manifestPath, onDispose, startApp } from "@radish/core";
import { hmr, manifest } from "@radish/core/effects";
import { dev } from "@radish/core/environment";
import {
  pluginBuild,
  pluginConfig,
  pluginEnv,
  pluginFS,
  pluginHMR,
  pluginImportmap,
  pluginManifest,
  pluginRender,
  pluginRouter,
  pluginServer,
  pluginStripTypes,
  pluginWS,
} from "@radish/core/plugins";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { pluginStdElements } from "@radish/std-elements";

const config: Config = {
  importmap: {
    install: [
      {
        package: "npm:@radishland/runtime",
        alias: "@radish/runtime",
        entrypoints: ["."],
      },
    ],
  },
  // speculationRules: {
  //   prerender: [{
  //     where: {
  //       and: [
  //         { href_matches: "/*" },
  //         { not: { href_matches: "/logout" } },
  //         { not: { href_matches: "/add-to-cart" } },
  //         { not: { selector_matches: ".do-not-prerender" } },
  //       ],
  //     },
  //     eagerness: "moderate",
  //   }],
  //   prefetch: [
  //     {
  //       where: { not: { href_matches: "/*" } },
  //       eagerness: "moderate",
  //     },
  //   ],
  // },
};

const handleManifestLoad = handlerFor(manifest.load, async () => {
  try {
    const manifestObject = (await import("./" + manifestPath))["manifest"];
    await manifest.set(manifestObject);
    return manifestObject;
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.startsWith("Module not found") &&
      error.message.includes("manifest.ts")
    ) {
      await manifest.write();
      return await manifest.load();
    }
    throw error;
  }
});

const scope = new HandlerScope(
  pluginStdElements,
  pluginWS,
  pluginServer,
  pluginRouter,
  pluginRender,
  pluginImportmap,
  handleManifestLoad,
  pluginManifest,
  pluginHMR,
  pluginStripTypes,
  pluginBuild,
  pluginEnv,
  pluginConfig,
  pluginFS,
);
onDispose(scope[Symbol.asyncDispose]);

await startApp(config);

if (dev) await hmr.start();
