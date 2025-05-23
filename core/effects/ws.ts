import { createEffect, type Effect } from "@radish/effect-system";

interface WS {
  handleSocket: (socket: WebSocket) => void;
  send: (message: string) => void;
}

export const ws: {
  /**
   * Handles a WebSocket
   */
  handleSocket: (socket: WebSocket) => Effect<void>;
  /**
   * Sends a message
   */
  send: (message: string) => Effect<void>;
} = {
  handleSocket: createEffect<WS["handleSocket"]>("ws/socket"),
  send: createEffect<WS["send"]>("ws/send"),
};
