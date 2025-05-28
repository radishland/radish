import { router, server } from "$effects/mod.ts";
import { handleRouterAddRoute } from "$lib/plugins/router/router.ts";
import { HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert/equals";
import { describe, test } from "@std/testing/bdd";
import { pluginServer } from "./mod.ts";

describe("server", () => {
  test("server/start: cleans-up without leaks", async () => {
    let cleanup = 0;

    {
      await using scope = new HandlerScope(pluginServer, handleRouterAddRoute);
      scope.onDispose(() => cleanup++);
      await server.start({ port: 1235 });
    }

    assertEquals(cleanup, 1);
  });

  test("server/handleRequest: handles requests", async () => {
    await using _ = new HandlerScope(pluginServer, handleRouterAddRoute);

    await router.addRoute({
      method: "GET",
      pattern: new URLPattern({ pathname: "/about" }),
      handleRoute: () => {
        return new Response("hi", {
          headers: { "content-type": "text/plain" },
        });
      },
    });

    await server.start({ port: 1235 });

    const res = await fetch("http://localhost:1235/about");
    const text = await res.text();

    assertEquals(text, "hi");
  });
});
