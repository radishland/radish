import { assert } from "@std/assert";
import { basename, extname, isAbsolute, normalize, relative } from "@std/path";

/**
 * Returns the file name without the extension
 */
export function filename(path: string): string {
  const extension = extname(path);
  assert(extension, `Expected "${path}" to be a file path`);
  return basename(path, extension);
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
