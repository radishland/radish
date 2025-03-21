import { startApp } from "@radish/core";
import { dev } from "@radish/core/env";
import type { Config, ManifestBase } from "@radish/core/types";
import {
  pluginDefaultEmit,
  pluginRadish,
  pluginStripTypes,
} from "@radish/core/plugins";

const config: Config = {
  importmap: {
    install: [
      "@preact/signals-core", // When using the development runtime version
      "@material/web/button/filled-button",
      "@material/web/button/outlined-button",
      "@material/web/checkbox/checkbox",
      "wired-elements",
      !dev() && "@shoelace-style/shoelace/dist/components/rating/rating.js",
    ],
    transform: (importmap) => {
      const imports = {
        // When using the development runtime version
        "radish": "/_radish/runtime/index.js",
        "radish/boot": "/_radish/runtime/boot.js",
      };
      return JSON.stringify({
        imports: { ...importmap.imports, ...imports },
        scopes: { ...importmap.scopes },
      });
    },
  },
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
