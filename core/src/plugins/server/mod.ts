import { router } from "$effects/router.ts";
import { server } from "$effects/server.ts";
import { dispose, onDispose } from "$lib/cleanup.ts";
import type { Config, Plugin } from "$lib/types.d.ts";
import { AppError, createStandardResponse } from "$lib/utils/http.ts";
import { handlerFor } from "@radish/effect-system";
import { getCookies, STATUS_CODE } from "@std/http";

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

export const handleServerRequest = handlerFor(
  server.handleRequest,
  async (request) => {
    try {
      const url = new URL(request.url);
      const cookies = getCookies(request.headers);

      return await router.handleRoute({ request, url, cookies });
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
 * Depends on `server/handle-request`
 */
export const handleServerStart = handlerFor(server.start, (options) => {
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
