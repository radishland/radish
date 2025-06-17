import { expandGlob, type ExpandGlobOptions, type WalkEntry } from "@std/fs";
import { basename } from "@std/path";
import { mapAsyncIterator } from "./iter.ts";
import { workspaceRelative } from "./path.ts";

/**
 * Maps the `@std/expandGlob` async iterator so that file paths are
 * normalized relative to the workspace root
 */
export function expandGlobWorkspaceRelative(
  glob: string | URL,
  options?: ExpandGlobOptions,
): AsyncIterableIterator<WalkEntry> {
  return mapAsyncIterator(
    expandGlob(glob, options),
    (entry) => ({ ...entry, path: workspaceRelative(entry.path) }),
  );
}

/**
 * Creates a WalkEntry from a path
 */
export const createWalkEntry = (path: string): WalkEntry => {
  return {
    isDirectory: false,
    isFile: true,
    path,
    name: basename(path),
    isSymlink: false,
  };
};
