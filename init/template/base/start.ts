import { manifestPath, startApp } from "$core";
import {
  pluginConfig,
  pluginImportmap,
  pluginIO,
  pluginManifest,
  pluginRadish,
  pluginStripTypes,
} from "$core/plugins";
import type { Config } from "$core/types";

const config: Config = {
  importmap: {
    install: [
      { package: "npm:@radishland/runtime", entrypoints: ["/boot"] },
    ],
  },
  plugins: [
    pluginRadish,
    pluginImportmap,
    pluginManifest,
    pluginStripTypes,
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
