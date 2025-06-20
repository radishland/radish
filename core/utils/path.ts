import { assert } from "@std/assert";
import { basename, extname, relative, SEPARATOR } from "@std/path";

/**
 * Returns the file name without the extension
 */
export function filename(path: string): string {
  const extension = extname(path);
  assert(extension, `Expected "${path}" to be a file path`);
  return basename(path, extension);
}

/**
 * Checks whether two paths are in a parent - child relation
 *
 * @param parent The parent path
 * @param child The child path
 */
export const isParent = (parent: string, child: string): boolean => {
  return relative(parent, child).split(SEPARATOR).at(0) !== "..";
};
