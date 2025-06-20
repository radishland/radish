import type { Config } from "@radish/core";
import { importmapPath, manifestPath, onDispose, startApp } from "@radish/core";
import { fs, hmr, importmap, manifest, router } from "@radish/core/effects";
import { dev } from "@radish/core/environment";
import {
  pluginBuild,
  pluginConfig,
  pluginEnv,
  pluginFS,
  pluginHMR,
  pluginImportmap,
  pluginManifest,
  pluginRender,
  pluginRouter,
  pluginServer,
  pluginStripTypes,
  pluginWS,
} from "@radish/core/plugins";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { pluginStdElements } from "@radish/std-elements";
import { serveDir, UserAgent } from "@std/http";
import { join } from "@std/path";

const dirname = import.meta.dirname!;
const clientRuntime = join(dirname, "..", "runtime", "client");

const substituteDevRuntime = handlerFor(router.onRequest, async (context) => {
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

const hooks = handlerFor(router.onRequest, (event) => {
  // Avoid mime type sniffing
  event.headers.set("X-Content-Type-Options", "nosniff");

  const ua = new UserAgent(event.request.headers.get("user-agent"));
  console.log("ua:", ua);

  return Handler.continue(event);
});

const handleManifestLoad = handlerFor(manifest.load, async () => {
  try {
    const manifestObject = (await import("./" + manifestPath))["manifest"];
    await manifest.set(manifestObject);
    return manifestObject;
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.startsWith("Module not found") &&
      error.message.includes("manifest.ts")
    ) {
      await manifest.write();
      return await manifest.load();
    }
    throw error;
  }
});

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
  // rewrites the importmap when using the development runtime version
  handlerFor(importmap.write, async () => {
    const importmapObject = await importmap.get();

    await fs.write(
      importmapPath,
      JSON.stringify({
        imports: {
          ...importmapObject.imports,
          "@radish/runtime": "/@radish/runtime/index.js",
        },
        scopes: { ...importmapObject.scopes },
      }),
    );
  }),
  pluginStdElements,
  pluginWS,
  pluginServer,
  pluginRouter,
  pluginRender,
  pluginImportmap,
  handleManifestLoad,
  pluginManifest,
  pluginHMR,
  pluginStripTypes,
  pluginBuild,
  pluginEnv,
  pluginConfig,
  pluginFS,
);
onDispose(scope[Symbol.asyncDispose]);

await startApp(config);

const _ = new HandlerScope(hooks, substituteDevRuntime);

if (dev) await hmr.start();
