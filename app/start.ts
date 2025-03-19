import { startApp } from "@radish/core";
import type { Config } from "@radish/core/types";
import {
  pluginDefaultEmit,
  pluginRadish,
  pluginStripTypes,
} from "@radish/core/plugins";
import type { ManifestBase } from "../core/src/types.d.ts";

const config: Config = {
  router: { matchers: { number: /\d+/ }, nodeModulesRoot: ".." },
  plugins: [
    {
      name: "radish-rewrite-manifest-imports",
      manifestWrite: (content) => {
        return content.replace("$core", "@radish/core");
      },
    },
    pluginRadish(),
    pluginStripTypes,
    pluginDefaultEmit,
  ],
  // speculationRules: {
  //   prerender: [{
  //     where: {
  //       and: [
  //         { href_matches: "/*" },
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

const loadManifest = async () =>
  (await import("./_generated/manifest.ts") as ManifestBase)["manifest"];

await startApp(loadManifest, config);
