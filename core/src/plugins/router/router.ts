import { config } from "$effects/config.ts";
import { io } from "$effects/io.ts";
import { manifest } from "$effects/manifest.ts";
import type { Manifest } from "$effects/render.ts";
import { type Route, router } from "$effects/router.ts";
import { onDispose } from "$lib/cleanup.ts";
import { routesFolder } from "$lib/constants.ts";
import type { Plugin } from "$lib/mod.ts";
import { manifestShape } from "$lib/plugins/render/hooks/manifest.ts";
import { createStandardResponse } from "$lib/utils/http.ts";
import { addHandlers, Handler, handlerFor } from "@radish/effect-system";
import { assertExists, assertObjectMatch } from "@std/assert";
import { serveFile, STATUS_CODE } from "@std/http";
import { dirname } from "@std/path";

/**
 * The named group can provide an optional regex matcher name
 */
const square_brackets_around_named_group =
  /\[([^\]=]+)\]|\[([^\]=]+)=([^\]]+)\]/;

const routes: Route[] = [];

onDispose(() => {
  routes.length = 0;
  console.log("Routes cleared");
});

const handleAddRoute = handlerFor(router.addRoute, (route) => {
  const newHandler = handlerFor(router.handleRoute, (context) => {
    const patternResult = route.pattern.exec(context.request.url);

    if (
      patternResult &&
      (Array.isArray(route.method)
        ? route.method.includes(context.request.method)
        : route.method === context.request.method)
    ) {
      return route.handler({ ...context, params: patternResult });
    }

    return Handler.continue(context);
  });

  addHandlers([newHandler]);

  if (!routes.includes(route)) {
    routes.push(route);
  }
});

const handleRouterDefaultRouteHandler = handlerFor(router.handleRoute, () => {
  return createStandardResponse(STATUS_CODE.NotFound, {
    headers: { "Content-Type": "text/plain" },
  });
});

const handleRouterInit = handlerFor(router.init, async () => {
  const rootPath = new RegExp(`^${routesFolder}/?`);
  const { router: routerConfig } = await config.read();

  const _manifest = await manifest.get() as Manifest;
  assertObjectMatch(_manifest, manifestShape);

  for (const route of Object.values(_manifest.routes)) {
    const pathname = dirname(route.path)
      .replace(rootPath, "/")
      .replace(
        square_brackets_around_named_group,
        (_match, _, namedGroup, matcherName) => {
          if (matcherName) {
            const matcher = routerConfig?.matchers?.[matcherName];
            assertExists(matcher, `Regex matcher not found: ${matcherName}`);

            return `:${namedGroup}(${matcher.source})`;
          }
          return `:${namedGroup}`;
        },
      );

    const destPath = await io.emitTo(route.path);

    await router.addRoute({
      method: "GET",
      pattern: new URLPattern({ pathname }),
      handler: async ({ request }) => {
        return await serveFile(request, destPath);
      },
    });
  }

  console.log(`Routes ${routes.map((r) => r.pattern.pathname)}`);
});

export const pluginRouter: Plugin = {
  name: "plugin-router",
  handlers: [
    handleAddRoute,
    handleRouterDefaultRouteHandler,
    handleRouterInit,
  ],
};
