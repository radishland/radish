import { manifest } from "$effects/manifest.ts";
import { build, config, router, server } from "$effects/mod.ts";
import type { Route } from "$effects/router.ts";
import { manifestShape } from "$lib/plugins/render/hooks/manifest.ts";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import {
  assertEquals,
  assertInstanceOf,
  AssertionError,
  assertStringIncludes,
  unreachable,
} from "@std/assert";
import { beforeEach, describe, test } from "@std/testing/bdd";
import { handleRouterAddRoute, handleRouterInit } from "./router.ts";
import { pluginServer } from "../mod.ts";

const routes: Route[] = [];

beforeEach(() => {
  routes.length = 0;
});

describe("router", () => {
  test("router/init: throws when a matcher is missing", async () => {
    using _ = new HandlerScope(
      handleRouterInit,
      handlerFor(config.read, () => ({ router: { matchers: {} } })),
      handlerFor(build.dest, () => "served/path"),
      handlerFor(router.addRoute, (route) => {
        routes.push(route);
      }),
      handlerFor(manifest.get, () => {
        return {
          ...manifestShape,
          routes: {
            "routes/[id=number]/index.html": {
              kind: "route",
              path: "routes/[id=number]/index.html",
            },
          },
        };
      }),
    );

    try {
      await router.init();
      unreachable();
    } catch (error) {
      assertInstanceOf(error, AssertionError);
      assertStringIncludes(error.message, "Regex matcher not found");
    }
  });

  test("router/init: dynamically adds manifest routes", async () => {
    using _ = new HandlerScope(
      handleRouterInit,
      handlerFor(config.read, () => {
        return { router: { matchers: { number: /^\d+/, uuid: /\w+/ } } };
      }),
      handlerFor(build.dest, () => "served/path"),
      handlerFor(router.addRoute, (route) => {
        routes.push(route);
      }),
      handlerFor(manifest.get, () => {
        return {
          ...manifestShape,
          routes: {
            "routes/index.html": {
              kind: "route",
              path: "routes/index.html",
            },
            "routes/about/index.html": {
              kind: "route",
              path: "routes/about/index.html",
            },
            "routes/book{s}?/index.html": {
              kind: "route",
              path: "routes/book{s}?/index.html",
            },
            "routes/:number/index.html": {
              kind: "route",
              path: "routes/:number/index.html",
            },
            "routes/[id]/index.html": {
              kind: "route",
              path: "routes/[id]/index.html",
            },
            "routes/[id=number]/index.html": {
              kind: "route",
              path: "routes/[id=number]/index.html",
            },
            "routes/[token=uuid]/[category]/[id=number]/index.html": {
              kind: "route",
              path: "routes/[token=uuid]/[category]/[id=number]/index.html",
            },
          },
        };
      }),
    );

    await router.init();

    assertEquals(routes.map((route) => route.pattern.pathname), [
      "/",
      "/about",
      "/book{s}?",
      "/:number",
      "/:id",
      "/:id(^\\d+)",
      "/:token(\\w+)/:category/:id(^\\d+)",
    ]);
  });

  test("router/handleRoute: user hooks can decorate the dynamically generated routes", async () => {
    // Mutates the Headers object
    const hooks = handlerFor(
      router.handleRoute,
      (event) => {
        event.headers.set("X-Content-Type-Options", "nosniff");
        if (event.url.pathname === "/") {
          event.headers.set("root-path-header", "true");
        }
        if (event.url.pathname === "/about") {
          event.headers.set("about-path-header", "true");
        }
        return Handler.continue(event);
      },
    );

    await using _ = new HandlerScope(
      pluginServer,
      handleRouterAddRoute,
      handleRouterInit,
      handlerFor(config.read, () => {
        return { router: { matchers: { number: /^\d+/, uuid: /\w+/ } } };
      }),
      handlerFor(build.dest, () => "served/path"),
      handlerFor(router.addRoute, (route) => {
        routes.push(route);
      }),
      handlerFor(manifest.get, () => {
        return {
          ...manifestShape,
          routes: {
            "routes/index.html": {
              kind: "route",
              path: "routes/index.html",
            },
            "routes/about/index.html": {
              kind: "route",
              path: "routes/about/index.html",
            },
          },
        };
      }),
    );

    await router.init();
    await server.start({ port: 1235 });

    const __ = new HandlerScope(hooks);

    const [root, about] = await Promise.all([
      fetch("http://localhost:1235/"),
      fetch("http://localhost:1235/about"),
    ]);

    assertEquals(root.headers.has("x-content-type-options"), true);
    assertEquals(root.headers.has("root-path-header"), true);
    assertEquals(root.headers.has("about-path-header"), false);

    assertEquals(about.headers.has("x-content-type-options"), true);
    assertEquals(about.headers.has("root-path-header"), false);
    assertEquals(about.headers.has("about-path-header"), true);

    await root.body?.cancel();
    await about.body?.cancel();
  });
});
