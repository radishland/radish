import { manifestPath, startApp } from "@radish/core";
import {
  pluginDefaultEmit,
  pluginRadish,
  pluginStripTypes,
} from "@radish/core/plugins";
import type { Config } from "@radish/core/types";

const config: Config = {
  importmap: {
    install: [
      { package: "npm:@preact/signals-core" }, // When using the development runtime version
    ],
    include: [
      {
        alias: "@material/web",
        entrypoints: [
          "/button/filled-button",
          "/button/outlined-button",
          "/checkbox/checkbox",
        ],
      },
      { alias: "wired-elements" },
      {
        alias: "@shoelace-style/shoelace",
        entrypoints: ["/cdn/components/rating/rating.js"],
      },
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

const loadManifest = async () => (await import(manifestPath))["manifest"];

await startApp(loadManifest, config);
