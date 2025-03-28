import { startApp } from "$core";
import {
  pluginDefaultEmit,
  pluginRadish,
  pluginStripTypes,
} from "$core/plugins";
import type { Config } from "$core/types";

const config: Config = {
  plugins: [
    pluginRadish(),
    pluginStripTypes,
    pluginDefaultEmit,
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

const loadManifest = async () =>
  (await import("./_generated/manifest.ts"))["manifest"];

await startApp(loadManifest, config);
