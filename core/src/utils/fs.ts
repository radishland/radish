import { expandGlob, type ExpandGlobOptions, type WalkEntry } from "@std/fs";
import { workspaceRelative } from "./path.ts";
import { mapAsyncIterator } from "./iter.ts";

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
