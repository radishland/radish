import { assert } from "@std/assert";
import { basename } from "@std/path/basename";

/**
 * Generic memoize decorator for a function with no arguments
 */
export const memoize = <T>(fn: () => T) => {
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
export const fileName = (path: string) => {
  const name = basename(path).split(".")[0];
  assert(!!name, `Expected ${path} filename to not be falsy`);

  return name;
};

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

/**
 * Concatenates many iterators into a single one
 */
export function* concatIterators<T>(
  ...iterators: Iterable<T>[]
) {
  for (const iterator of iterators) {
    yield* iterator;
  }
}

type LooseAutocomplete<T extends string> = T | Omit<string, T>;

type Types = LooseAutocomplete<
  | "null"
  | "undefined"
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "symbol"
  | "function"
  | "class"
  | "array"
  | "date"
  | "error"
  | "regexp"
  | "object"
>;

/**
 * A more reliable `type` function
 */
export function type(value: unknown): Types {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  const baseType = typeof value;
  // Primitive types
  if (!["object", "function"].includes(baseType)) {
    return baseType;
  }

  // Symbol.toStringTag often specifies the "display name" of the
  // object's class. It's used in Object.prototype.toString().
  // @ts-expect-error
  const tag = value[Symbol.toStringTag];
  if (typeof tag === "string") {
    return tag;
  }

  // If it's a function whose source code starts with the "class" keyword
  if (
    baseType === "function" &&
    Function.prototype.toString.call(value).startsWith("class")
  ) {
    return "class";
  }

  // The name of the constructor; for example `Array`, `GeneratorFunction`,
  // `Number`, `String`, `Boolean` or `MyCustomClass`
  const className = value.constructor.name;
  if (typeof className === "string" && className !== "") {
    return className.toLowerCase();
  }

  // At this point there's no robust way to get the type of value,
  // so we use the base implementation.
  return baseType;
}
