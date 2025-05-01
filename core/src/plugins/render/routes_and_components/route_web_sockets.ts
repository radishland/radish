import { handlerFor } from "../../../effects/effects.ts";
import { Handler } from "../../../effects/handlers.ts";
import { render } from "../../../effects/render.ts";
import { dev } from "../../../environment.ts";

export const handleInsertWebSocketScript = handlerFor(
  render.route,
  (route, insertHead, insertBody) => {
    // Insert WebSocket script
    if (dev) {
      insertHead += `
          <script>
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
          </script>`;
    }
    return Handler.continue(route, insertHead, insertBody);
  },
);
