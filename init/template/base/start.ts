import { manifestPath, startApp } from "@radish/core";
import {
  pluginBuild,
  pluginConfig,
  pluginEnv,
  pluginImportmap,
  pluginIO,
  pluginManifest,
  pluginRender,
  pluginStripTypes,
} from "@radish/core/plugins";
import type { Config } from "@radish/core/types";

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
    pluginRender,
    pluginBuild,
    pluginImportmap,
    pluginManifest,
    pluginStripTypes,
    pluginConfig,
    pluginEnv,
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
