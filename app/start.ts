import type { Config } from "@radish/core";
import { importmapPath, manifestPath, startApp } from "@radish/core";
import { importmap, io, router } from "@radish/core/effects";
import { handlerFor } from "@radish/effect-system";
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
import { join } from "@std/path";
import { Handler } from "@radish/effect-system";
import { serveDir, UserAgent } from "@std/http";
import { dev } from "../core/src/environment.ts";

const dirname = import.meta.dirname ?? "";
const clientRuntime = join(dirname, "..", "runtime", "client");

const substituteDevRuntime = handlerFor(router.handleRoute, async (context) => {
  const pattern = new URLPattern({ pathname: "/_radish/runtime/*" });
  const patternResult = pattern.exec(context.request.url);

  if (patternResult && "GET" === context.request.method) {
    return await serveDir(context.request, {
      fsRoot: clientRuntime,
      urlRoot: "_radish/runtime",
    });
  }

  return Handler.continue(context);
});

const handleUALogger = handlerFor(
  router.handleRoute,
  (context) => {
    // Avoid mime type sniffing
    context.request.headers.set("X-Content-Type-Options", "nosniff");

    if (!dev) {
      const ua = new UserAgent(context.request.headers.get("user-agent") ?? "");
      console.log("ua:", ua);
    }

    return Handler.continue(context);
  },
);

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
    { name: "sub", handlers: [substituteDevRuntime] },
    pluginWS,
    pluginServer,
    pluginRouter,

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
    pluginBuild,
    pluginImportmap,
    pluginManifest,
    pluginHMR,
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
