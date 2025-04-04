import { assert } from "@std/assert";
import { basename } from "@std/path/basename";

export function throwUnlessNotFound(error: unknown) {
  if (!(error instanceof Deno.errors.NotFound)) {
    throw error;
  }
}

/**
 * Generic memoize decorator for a function with no arguments
 */
export const memoize = <T>(fn: () => T): () => T => {
  let computed = false;
  let result: T;

  return () => {
    if (!computed) {
      computed = true;
      result = fn();
    }
    return result;
  };
};

/**
 * Returns the file name without the extension
 */
export function fileName(path: string): string {
  const name = basename(path).split(".")[0];
  assert(!!name, `Expected ${path} filename to not be falsy`);

  return name;
}

export const setTimeoutWithAbort = (
  handler: () => void,
  timeout?: number,
  signal?: AbortSignal,
) => {
  if (signal?.aborted) return;

  const id = setTimeout(() => {
    if (!signal?.aborted) {
      handler();
    }
  }, timeout);

  signal?.addEventListener("abort", () => {
    clearTimeout(id);
  });
};
