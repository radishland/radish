import { basename } from "@std/path";
import { assert } from "@std/assert";

/**
 * Returns the file name without the extension
 */
export function fileName(path: string): string {
  const name = basename(path).split(".")[0];
  assert(!!name, `Expected ${path} filename to not be falsy`);

  return name;
}
