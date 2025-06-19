import { createEffect, type Effect } from "@radish/effect-system";

interface FS {
  read: (path: string) => string;
  write: (path: string, content: string) => void;
}

export const fs: {
  /**
   * Reads a file from a path
   */
  read: (path: string) => Effect<string>;
  /**
   * Writes content to a path
   */
  write: (path: string, content: string) => Effect<void>;
} = {
  read: createEffect<FS["read"]>("fs/read"),
  write: createEffect<FS["write"]>("fs/write"),
};
