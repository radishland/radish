import { hmr } from "$effects/hmr.ts";
import { server } from "$effects/server.ts";
import { ws } from "$effects/ws.ts";
import { dispose, onDispose } from "$lib/cleanup.ts";
import { dev } from "$lib/environment.ts";
import type { Plugin } from "$lib/types.d.ts";
import { AppError, createStandardResponse } from "$lib/utils/http.ts";
import { handlerFor } from "@radish/effect-system";
import { getCookies, STATUS_CODE } from "@std/http";

export const handleServerRequest = handlerFor(
  server.handleRequest,
  async (request, info) => {
    try {
      const url = new URL(request.url);
      const cookies = getCookies(request.headers);

      // return await handle(
      //   {
      //     context: { request, url, cookies },
      //     resolve: async (ctx) => await router.handler(ctx),
      //   },
      // );
      return new Response();
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
 * Handles the server/start effect. Depends on
 *
 * - hmr/start in dev mode to start the HMR watcher
 * - ws/start in dev mode to start the WebSocket server
 * - server/handle-request
 */
export const handleServerStart = handlerFor(server.start, async (options) => {
  if (dev) {
    await hmr.start();
    await ws.create();
  }

  const httpServer = Deno.serve(options, async (request, info) => {
    return await server.handleRequest(request, info);
  });

  onDispose(async () => {
    await httpServer.shutdown();
    console.log("Server closed");
  });

  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);
});

const shutdown = async () => {
  console.log("\nShutting down gracefully...");
  await dispose();
  Deno.exit();
};

export const pluginServer: Plugin = {
  name: "plugin-server",
  handlers: [handleServerStart, handleServerRequest],
};
