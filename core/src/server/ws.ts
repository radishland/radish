import { onDispose } from "../cleanup.ts";

let clients: Set<WebSocket>;

export const ws = {
  create() {
    clients = new Set<WebSocket>();

    onDispose(() => {
      for (const client of clients) client.close();
      clients.clear();
      console.log("WebSocket connection closed");
    });
  },
  handle(socket: WebSocket) {
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
  },

  send(payload: string) {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  },
};
