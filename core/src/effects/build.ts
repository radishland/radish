import type { WalkEntry } from "@std/fs";
import { createEffect } from "./effects.ts";

type BuildOptions = { incremental?: boolean };

interface Build {
  sort: (entries: WalkEntry[]) => WalkEntry[];
  file: (path: string) => void;
  start: (paths: string[], options?: BuildOptions) => void;
}

export const build = {
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
  start: createEffect<Build["start"]>("build/start"),
};
