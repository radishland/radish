import { ws } from "$effects/ws.ts";
import { handlerFor } from "@radish/effect-system";
import { onDispose } from "$lib/cleanup.ts";
import type { Plugin } from "$lib/mod.ts";
import { handleInsertWebSocketScript } from "./hooks/render.route.ts";
import { handleWSServerRequest } from "./hooks/server.handle-request.ts";
import { dev } from "$lib/environment.ts";

const clients = new Set<WebSocket>();

onDispose(() => {
  if (clients) {
    for (const client of clients) client.close();
    clients.clear();

    if (dev) console.log("WebSocket connection closed");
  }
});

const handleWSSend = handlerFor(ws.send, (payload) => {
  console.log("Hot-Reloading...");

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
});

const handleWSHandleSocket = handlerFor(ws.handleSocket, (socket) => {
  socket.addEventListener("open", () => {
    console.log("WebSocket Client connected");
    clients.add(socket);
  });
  socket.addEventListener("close", () => {
    console.log("WebSocket Client disconnected");
    clients.delete(socket);
  });
  socket.addEventListener("message", (e) => {
    console.log("WebSocket message", e);
  });
  socket.addEventListener("error", (e) => {
    console.log("WebSocket error", e);
  });
});

/**
 * The WebSocket plugin
 *
 * Hook into the `render/route` process and decorates the `server/handle-request` effect
 */
export const pluginWS: Plugin = {
  name: "plugin-ws",
  handlers: [
    handleWSHandleSocket,
    handleWSSend,
    handleInsertWebSocketScript,
    handleWSServerRequest,
  ],
};
