import type { WalkEntry } from "@std/fs";
import { createEffect, type Effect } from "@radish/effect-system";

export type BuildOptions = { root?: string };

interface Build {
  sort: (entries: WalkEntry[]) => WalkEntry[];
  file: (path: string) => void;
  files: (glob: string, options?: BuildOptions) => void;
  transform: (path: string, content: string) => string;
  dest: (path: string) => string;
}

export const build: {
  file: (path: string) => Effect<void>;
  sort: (entries: WalkEntry[]) => Effect<WalkEntry[]>;
  files: (glob: string, options?: BuildOptions | undefined) => Effect<void>;
  transform: (path: string, content: string) => Effect<string>;
  dest: (path: string) => Effect<string>;
} = {
  /**
   * Builds a single file
   */
  file: createEffect<Build["file"]>("build/file"),
  /**
   * Sorts paths for the build
   */
  sort: createEffect<Build["sort"]>("build/sort"),
  /**
   * Starts the build pipeline, performing build/sort and build/file on every file
   */
  files: createEffect<Build["files"]>("build/files"),
  transform: createEffect<Build["transform"]>("build/transform"),
  /**
   * Returns the destination path where a file or folder will be emitted after the build
   */
  dest: createEffect<Build["dest"]>("build/dest"),
};
