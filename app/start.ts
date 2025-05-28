import type { Config } from "@radish/core";
import { importmapPath, manifestPath, onDispose, startApp } from "@radish/core";
import { hmr, importmap, io, manifest, router } from "@radish/core/effects";
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
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { serveDir, UserAgent } from "@std/http";
import { join } from "@std/path";

const dirname = import.meta.dirname!;
const clientRuntime = join(dirname, "..", "runtime", "client");

const substituteDevRuntime = handlerFor(router.handleRoute, async (context) => {
  const pattern = new URLPattern({ pathname: "/@radish/runtime*" });
  const patternResult = pattern.exec(context.request.url);

  if (patternResult && "GET" === context.request.method) {
    return await serveDir(context.request, {
      fsRoot: clientRuntime,
      urlRoot: "@radish/runtime",
    });
  }

  return Handler.continue(context);
});

const hooks = handlerFor(
  router.handleRoute,
  (event) => {
    // Avoid mime type sniffing
    event.headers.set("X-Content-Type-Options", "nosniff");

    const ua = new UserAgent(event.request.headers.get("user-agent") ?? "");
    // console.log("ua:", ua);

    return Handler.continue(event);
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

await manifest.setLoader(async () =>
  (await import("./" + manifestPath))["manifest"]
);

await startApp(config);

const _ = new HandlerScope(
  hooks,
  substituteDevRuntime,
  // rewrites the importmap when using the development runtime version
  handlerFor(importmap.write, async () => {
    const importmapObject = await importmap.get();

    const imports = {
      "@radish/runtime": "/@radish/runtime/index.js",
      "@radish/runtime/boot": "/@radish/runtime/boot.js",
    };

    await io.write(
      importmapPath,
      JSON.stringify({
        imports: { ...importmapObject.imports, ...imports },
        scopes: { ...importmapObject.scopes },
      }),
    );
  }),
);

if (dev) await hmr.start();
