import { io } from "$effects/io.ts";
import { manifest } from "$effects/manifest.ts";
import { config, router } from "$effects/mod.ts";
import type { Route } from "$effects/router.ts";
import { manifestShape } from "$lib/plugins/render/hooks/manifest.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import {
  assertEquals,
  assertInstanceOf,
  AssertionError,
  assertStringIncludes,
  unreachable,
} from "@std/assert";
import { beforeEach, describe, test } from "@std/testing/bdd";
import { handleRouterInit } from "./router.ts";

const routes: Route[] = [];

beforeEach(() => {
  routes.length = 0;
});

describe("router", () => {
  test("throws when a matcher is missing", async () => {
    using _ = new HandlerScope(
      handleRouterInit,
      handlerFor(config.read, () => ({ router: { matchers: {} } })),
      handlerFor(io.emitTo, () => "served/path"),
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

  test("add routes", async () => {
    using _ = new HandlerScope(
      handleRouterInit,
      handlerFor(config.read, () => {
        return { router: { matchers: { number: /^\d+/, uuid: /\w+/ } } };
      }),
      handlerFor(io.emitTo, () => "served/path"),
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
});
