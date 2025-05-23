import { manifestPath, startApp } from "@radish/core";
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
import type { Config } from "@radish/core";

const config: Config = {
  importmap: {
    install: [
      {
        package: "npm:@radishland/runtime",
        alias: "@radish/runtime",
        entrypoints: [".", "/boot"],
      },
    ],
  },
  plugins: [
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
  ],
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

await startApp(
  config,
  async () => (await import("./" + manifestPath))["manifest"],
);
