import { ws } from "$effects/ws.ts";
import { handlerFor } from "@radish/effect-system";
import { onDispose } from "$lib/cleanup.ts";
import type { Plugin } from "$lib/mod.ts";
import { handleInsertWebSocketScript } from "./hooks/render.ts";

let clients: Set<WebSocket>;

const create = handlerFor(ws.create, () => {
  clients = new Set<WebSocket>();

  onDispose(() => {
    for (const client of clients) client.close();
    clients.clear();
    console.log("WebSocket connection closed");
  });
});

const send = handlerFor(ws.send, (payload) => {
  console.log("Hot-Reloading...");

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
});

const handle = handlerFor(ws.handle, (socket) => {
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
 * Depends on "render/route"
 */
export const pluginWS: Plugin = {
  name: "plugin-ws",
  handlers: [create, handle, send, handleInsertWebSocketScript],
};
