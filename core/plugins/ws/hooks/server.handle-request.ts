import { Handler, handlerFor } from "@radish/effect-system";
import { server } from "$effects/server.ts";
import { STATUS_CODE } from "@std/http";
import { ws } from "$effects/ws.ts";
import { dev } from "$lib/environment.ts";
import { createStandardResponse } from "$lib/utils/http.ts";

/**
 * @performs
 * - `ws/handle-socket`
 */
export const handleWSServerRequest = handlerFor(
  server.onRequest,
  async (request, info) => {
    if (!dev && request.headers.get("upgrade")) {
      // Not implemented: we don't support upgrades in production
      return createStandardResponse(STATUS_CODE.NotImplemented);
    }
    if (dev && request.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(request);
      await ws.handleSocket(socket);
      return response;
    }

    return Handler.continue(request, info);
  },
);
