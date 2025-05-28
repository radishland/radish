import { ws } from "$effects/ws.ts";
import { handlerFor, type Plugin } from "@radish/effect-system";
import { handleInsertWebSocketScript } from "./hooks/render.route.ts";
import { handleWSServerRequest } from "./hooks/server.handle-request.ts";

const clients = new Set<WebSocket>();

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
handleWSHandleSocket[Symbol.dispose] = () => {
  if (clients.size) {
    for (const client of clients) client.close();
    clients.clear();

    console.log("WebSocket connection closed");
  }
};

/**
 * The WebSocket plugin
 *
 * @hooks
 * - `render/route`
 * - `server/handle-request`
 *
 * @performs
 * - `config/read`
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
