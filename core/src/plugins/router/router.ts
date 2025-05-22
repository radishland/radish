import { config } from "$effects/config.ts";
import { io } from "$effects/io.ts";
import { manifest } from "$effects/manifest.ts";
import type { Manifest } from "$effects/render.ts";
import { type Route, type RouteContext, router } from "$effects/router.ts";
import { routesFolder } from "$lib/constants.ts";
import type { Plugin } from "$lib/mod.ts";
import { manifestShape } from "$lib/plugins/render/hooks/manifest.ts";
import type { MaybePromise } from "$lib/types.d.ts";
import { createStandardResponse } from "$lib/utils/http.ts";
import { addHandlers, Handler, handlerFor } from "@radish/effect-system";
import { assertExists, assertObjectMatch } from "@std/assert";
import { serveFile, STATUS_CODE } from "@std/http";
import { dirname } from "@std/path";

/**
 * The named group can provide an optional regex matcher
 */
const square_brackets_around_named_group =
  /\[(?<namedGroup>[^\]=]+)\]|\[(?<name>[^\]=]+)=(?<matcher>[^\]]+)\]/g;

/**
 * Convenient way to create a new route.
 *
 * Dynamically creates and registers a handler for `router/handle-route`. If both the route method and pattern match on a given request, the provided callback runs.
 */
export const handleAddRoute: Handler<[route: Route], void> = handlerFor(
  router.addRoute,
  (route) => {
    const newHandler = handlerFor(router.handleRoute, (context) => {
      const patternResult = route.pattern.exec(context.request.url);

      if (
        patternResult &&
        (Array.isArray(route.method)
          ? route.method.includes(context.request.method)
          : route.method === context.request.method)
      ) {
        return route.handleRoute({ ...context, params: patternResult });
      }

      return Handler.continue(context);
    });

    addHandlers([newHandler]);
  },
);

/**
 * Default handler for `router/handle-route`
 *
 * @returns A standard 404 Not Found `text/plain` response
 */
export const handleRouterDefaultRouteHandler: Handler<
  [context: RouteContext],
  MaybePromise<Response>
> = handlerFor(
  router.handleRoute,
  () => {
    return createStandardResponse(STATUS_CODE.NotFound, {
      headers: { "Content-Type": "text/plain" },
    });
  },
);

/**
 * Performs the `router/add-route` effect for each route of the manifest
 *
 * @performs
 * - `config/read`
 * - `io/emit`
 * - `manifest/get`
 * - `router/add-route`
 */
export const handleRouterInit: Handler<[], void> = handlerFor(
  router.init,
  async () => {
    const rootPath = new RegExp(`^${routesFolder}/?`);
    const { router: routerConfig } = await config.read();

    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    for (const route of Object.values(_manifest.routes)) {
      const pathname = dirname(route.path)
        .replace(rootPath, "/")
        .replaceAll(
          square_brackets_around_named_group,
          (_match, namedGroup, name, matcherName) => {
            if (matcherName) {
              const matcher = routerConfig?.matchers?.[matcherName];
              assertExists(matcher, `Regex matcher not found: ${matcherName}`);

              return `:${name}(${matcher.source})`;
            }
            return `:${namedGroup}`;
          },
        );

      const destPath = await io.emitTo(route.path);

      await router.addRoute({
        method: "GET",
        pattern: new URLPattern({ pathname }),
        handleRoute: async ({ request }) => {
          return await serveFile(request, destPath);
        },
      });
    }
  },
);

/**
 * The router plugin
 *
 * @performs
 * - `config/read`
 * - `io/emit`
 * - `manifest/get`
 */
export const pluginRouter: Plugin = {
  name: "plugin-router",
  handlers: [
    handleAddRoute,
    handleRouterDefaultRouteHandler,
    handleRouterInit,
  ],
};
