import { createEffect, type Effect } from "@radish/effect-system";
import type { WalkEntry, WalkOptions } from "@std/fs";

interface FS {
  ensureDir: (path: string) => void;
  exists: (path: string) => boolean;
  read: (path: string) => string;
  remove: (path: string) => void;
  walk: (root: string, options?: WalkOptions) => WalkEntry[];
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
  /**
   * Tests whether or not the given path exists by checking with the file system
   */
  exists: (path: string) => Effect<boolean>;
  /**
   * Ensures that the directory exists
   */
  ensureDir: (path: string) => Effect<void>;
  /**
   * Removes the named file or directory
   */
  remove: (path: string) => Effect<void>;
  /**
   * Recursively walks through a directory and yields information about each file and directory encountered
   */
  walk: (root: string, options?: WalkOptions) => Effect<WalkEntry[]>;
} = {
  ensureDir: createEffect<FS["ensureDir"]>("fs/ensure-dir"),
  exists: createEffect<FS["exists"]>("fs/exists"),
  read: createEffect<FS["read"]>("fs/read"),
  write: createEffect<FS["write"]>("fs/write"),
  remove: createEffect<FS["remove"]>("fs/remove"),
  walk: createEffect<FS["walk"]>("fs/walk"),
};
