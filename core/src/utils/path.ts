import { assert } from "@std/assert";
import { basename, isAbsolute, normalize, relative } from "@std/path";

/**
 * Returns the file name without the extension
 */
export function fileName(path: string): string {
  const name = basename(path).split(".")[0];
  assert(!!name, `Expected ${path} filename to not be falsy`);

  return name;
}

/**
 * Normalizes paths relative to the project workspace
 */
export const workspaceRelative = (path: string) => {
  const normalized = normalize(path);
  if (isAbsolute(normalized)) {
    return relative(Deno.cwd(), normalized);
  }
  return normalized;
};
