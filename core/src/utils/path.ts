import { assert } from "@std/assert";
import {
  basename,
  common,
  extname,
  isAbsolute,
  normalize,
  relative,
  resolve,
} from "@std/path";

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

/**
 * Checks whether two paths are in a parent - child relation
 *
 * @param parent The parent path. Must be a directory
 * @param child The child path
 *
 * @throws {AssertionError} if the parent path is not a directory
 */
export const isParent = (parent: string, child: string): boolean => {
  const parentInfo = Deno.statSync(parent);
  assert(parentInfo.isDirectory);

  const resolvedParent = resolve(parent);
  const resolvedChild = resolve(child);
  return common([resolvedParent, resolvedChild]) === resolvedParent;
};
