import { router } from "$effects/router.ts";
import { server } from "$effects/server.ts";
import { dispose } from "$lib/cleanup.ts";
import type { Config } from "$lib/types.d.ts";
import { AppError, createStandardResponse } from "$lib/utils/http.ts";
import { handlerFor, type Plugin } from "@radish/effect-system";
import { getCookies, STATUS_CODE } from "@std/http";

let httpServer: Deno.HttpServer<Deno.Addr> | undefined;

/**
 * Default server options
 */
export const SERVER_DEFAULTS: Config["server"] = {
  port: 1235,
  hostname: "127.0.0.1",
  onListen: (addr) => {
    console.log(
      `%cListening at ${addr.hostname}:${addr.port}`,
      "color: green",
    );
  },
};

/**
 * @performs
 * - `router/handle-request`
 */
export const handleServerRequest = handlerFor(
  server.onRequest,
  async (request) => {
    try {
      const url = new URL(request.url);
      const cookies = getCookies(request.headers);
      const headers = new Headers();

      const response = await router.onRequest({
        request,
        url,
        cookies,
        headers,
      });

      for (const [name, value] of headers.entries()) {
        response.headers.set(name, value);
      }

      return response;
    } catch (error) {
      console.error(error);
      if (error instanceof AppError) {
        return createStandardResponse(error.statusCode, {
          statusText: error.message,
          headers: { "Content-Type": "text/plain" },
        });
      }

      return createStandardResponse(STATUS_CODE.InternalServerError, {
        headers: { "Content-Type": "text/plain" },
      });
    }
  },
);

/**
 * Handles the server/start effect.
 *
 * @performs
 * - `server/handle-request`
 */
export const handleServerStart = handlerFor(server.start, (options) => {
  httpServer = Deno.serve(
    { ...SERVER_DEFAULTS, ...options },
    async (request, info) => {
      return await server.onRequest(request, info);
    },
  );

  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);
});
handleServerStart[Symbol.asyncDispose] = async () => {
  if (httpServer) {
    await httpServer.shutdown();
    Deno.removeSignalListener("SIGINT", shutdown);
    Deno.removeSignalListener("SIGTERM", shutdown);
    console.log("Server closed");
  }
};

const shutdown = async () => {
  console.log("\nShutting down gracefully...");
  await dispose();
  Deno.exit();
};

/**
 * The server plugin
 *
 * This plugin has an async cleanup, so a {@linkcode HandlerScope} using this plugin needs `await using`
 *
 * @example Start the server
 *
 * ```ts
 * await using _ = new HandlerScope(pluginServer, handleRouterAddRoute);
 *
 * await router.addRoute({
 *   method: "GET",
 *   pattern: new URLPattern({ pathname: "/about" }),
 *   onRequest: () => {
 *     return new Response("hi", {
 *       headers: { "content-type": "text/plain" },
 *     });
 *   },
 * });
 *
 * await server.start({ port: 1235 });
 * const res = await fetch("http://localhost:1235/about");
 * const text = await res.text();
 *
 * assertEquals(text, "hi");
 * ```
 *
 * @performs
 * - `router/handle-route`
 */
export const pluginServer: Plugin = {
  name: "plugin-server",
  handlers: [handleServerStart, handleServerRequest],
};
