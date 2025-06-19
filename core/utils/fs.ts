import type { WalkEntry } from "@std/fs";
import { basename } from "@std/path";

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

/**
 * Rethrows errors only if they're not a Deno.errors.NotFound instance
 */
export function throwUnlessNotFound(error: unknown) {
  if (!(error instanceof Deno.errors.NotFound)) {
    throw error;
  }
}
