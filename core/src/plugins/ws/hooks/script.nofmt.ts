const ws = new WebSocket("ws://localhost:1235/ws");
ws.onmessage = (e) => {
  if (e.data === "reload") {
    console.log("Reload triggered by server");
    location.reload();
  }
};
ws.onerror = (e) => {
  console.error("WebSocket error", e);
};
ws.onclose = () => {
  console.log("Websocket connection closed");
};