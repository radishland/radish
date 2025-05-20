import { createEffect, type EffectWithId } from "@radish/effect-system";

interface WS {
  create: () => void;
  handle: (socket: WebSocket) => void;
  send: (message: string) => void;
}

export const ws: {
  create: EffectWithId<[], void>;
  handle: EffectWithId<[WebSocket], void>;
  send: EffectWithId<[string], void>;
} = {
  /**
   * Creates the WebSocket client
   */
  create: createEffect<WS["create"]>("ws/create"),
  /**
   * Handles a WebSocket
   */
  handle: createEffect<WS["handle"]>("ws/handle"),
  /**
   * Sends a message
   */
  send: createEffect<WS["send"]>("ws/send"),
};
