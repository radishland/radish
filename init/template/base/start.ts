import type { Config } from "@radish/core";
import { manifestPath, onDispose, startApp } from "@radish/core";
import { hmr, manifest } from "@radish/core/effects";
import { dev } from "@radish/core/environment";
import {
  pluginBuild,
  pluginConfig,
  pluginEnv,
  pluginHMR,
  pluginImportmap,
  pluginIO,
  pluginManifest,
  pluginRender,
  pluginRouter,
  pluginServer,
  pluginStripTypes,
  pluginWS,
} from "@radish/core/plugins";
import { HandlerScope } from "@radish/effect-system";

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

const scope = new HandlerScope(
  pluginWS,
  pluginServer,
  pluginRouter,
  pluginRender,
  pluginImportmap,
  pluginManifest,
  pluginHMR,
  pluginStripTypes,
  pluginBuild,
  pluginEnv,
  pluginConfig,
  pluginIO,
);
onDispose(scope[Symbol.asyncDispose]);

await manifest.set(async () => (await import("./" + manifestPath))["manifest"]);

await startApp(config);

if (dev) await hmr.start();
