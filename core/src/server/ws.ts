export const ws = {
  clients: new Set<WebSocket>(),

  handleWebSocket(socket: WebSocket) {
    socket.addEventListener("open", () => {
      console.log("WebSocket Client connected");
      this.clients.add(socket);
    });
    socket.addEventListener("close", () => {
      console.log("WebSocket Client disconnected");
      this.clients.delete(socket);
    });
    socket.addEventListener("message", (e) => {
      console.log("WebSocket message", e);
    });
    socket.addEventListener("error", (e) => {
      console.log("WebSocket error", e);
    });
  },

  send(payload: string) {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  },

  close() {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
  },
};
