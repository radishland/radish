import { createEffect, type EffectWithId } from "@radish/effect-system";

interface WS {
  handleSocket: (socket: WebSocket) => void;
  send: (message: string) => void;
}

export const ws: {
  handleSocket: EffectWithId<[WebSocket], void>;
  send: EffectWithId<[string], void>;
} = {
  /**
   * Handles a WebSocket
   */
  handleSocket: createEffect<WS["handleSocket"]>("ws/socket"),
  /**
   * Sends a message
   */
  send: createEffect<WS["send"]>("ws/send"),
};
