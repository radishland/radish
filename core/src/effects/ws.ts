import { createEffect, type EffectWithId } from "@radish/effect-system";

interface WS {
  create: () => void;
  handleSocket: (socket: WebSocket) => void;
  send: (message: string) => void;
}

export const ws: {
  create: EffectWithId<[], void>;
  handleSocket: EffectWithId<[WebSocket], void>;
  send: EffectWithId<[string], void>;
} = {
  /**
   * Creates the WebSocket client
   */
  create: createEffect<WS["create"]>("ws/create"),
  /**
   * Handles a WebSocket
   */
  handleSocket: createEffect<WS["handleSocket"]>("ws/socket"),
  /**
   * Sends a message
   */
  send: createEffect<WS["send"]>("ws/send"),
};
