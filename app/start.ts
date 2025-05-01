import { importmapPath, manifestPath, startApp } from "@radish/core";
import { handlerFor, importmap, io } from "@radish/core/effects";
import {
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
  },
  router: { matchers: { number: /\d+/ }, nodeModulesRoot: ".." },
  plugins: [
    pluginRender,
    {
      name: "plugin-rewrite-importmap-imports",
      handlers: [
        // rewrites the importmap when using the development runtime version
        handlerFor(importmap.write, async () => {
          const importmapObject = await importmap.get();

          const imports = {
            "radish": "/_radish/runtime/index.js",
            "radish/boot": "/_radish/runtime/boot.js",
          };

          await io.writeFile(
            importmapPath,
            JSON.stringify({
              imports: { ...importmapObject.imports, ...imports },
              scopes: { ...importmapObject.scopes },
            }),
          );
        }),
      ],
    },
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
