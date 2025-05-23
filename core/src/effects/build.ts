import type { WalkEntry } from "@std/fs";
import { createEffect, type EffectWithId } from "@radish/effect-system";

type BuildOptions = { incremental?: boolean };

interface Build {
  sort: (entries: WalkEntry[]) => WalkEntry[];
  file: (path: string) => void;
  start: (paths: string[], options?: BuildOptions) => void;
  transform: (path: string, content: string) => string;
  dest: (path: string) => string;
}

export const build: {
  file: EffectWithId<[path: string], void>;
  sort: EffectWithId<[entries: WalkEntry[]], WalkEntry[]>;
  start: EffectWithId<
    [paths: string[], options?: BuildOptions | undefined],
    void
  >;
  transform: EffectWithId<[path: string, content: string], string>;
  dest: EffectWithId<[path: string], string>;
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
  start: createEffect<Build["start"]>("build/start"),
  transform: createEffect<Build["transform"]>("build/transform"),
  /**
   * Returns the destination path where a file or folder will be emitted after the build
   */
  dest: createEffect<Build["dest"]>("build/dest"),
};
