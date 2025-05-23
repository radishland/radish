import { createEffect, type Effect } from "@radish/effect-system";

interface IO {
  read: (path: string) => string;
  write: (path: string, content: string) => void;
}

export const io: {
  /**
   * Reads a file from a path
   */
  read: (path: string) => Effect<string>;
  /**
   * Writes content to a path
   */
  write: (path: string, content: string) => Effect<void>;
} = {
  read: createEffect<IO["read"]>("io/read"),
  write: createEffect<IO["write"]>("io/write"),
};
