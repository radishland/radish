import { assert, assertExists } from "@std/assert";
import type { StrictExclude } from "@fcrozatier/ts-helpers";

export type ExecutionStrategy =
  | "first"
  | "first-non-nullable"
  | "sequential"
  | "chained"
  | "standalone";

// Phantom type parameters preserve the type information defining handlers' signatures
export interface Operation<T, U extends ExecutionStrategy> {
  readonly name: string;
  readonly signature: T;
  readonly strategy: U;
}

const operations = new Map<
  string,
  {
    strategy: StrictExclude<ExecutionStrategy, "standalone">;
    handlers: Function[];
  } | { strategy: "standalone"; handler?: Function }
>();

const queue = [];

/**
 * Defines a new operation plugins can perform.
 *
 * Use the generic type parameter to provide the signature of the handlers of this operation
 *
 * @param {string} name The name of the operation. Used for debugging, logging etc
 * @param {string} strategy The execution strategy of the operation.
 *
 * @example
 *
 * const logOperation = defineOperation<(message: string) => void>("log","sequential");
 *
 * @example
 * const fetchOperation = defineOperation<(url: string) => Promise<Response>>("fetch", "first");
 */
// TODO Refine handler type depending on strategy: chained handlers extend U -> U, sequential handlers return void
export function defineOperation<T extends (...args: any[]) => any>(
  name: string,
  strategy: "first",
): Operation<T, "first">;
export function defineOperation<T extends (...args: any[]) => any>(
  name: string,
  strategy: "first-non-nullable",
): Operation<T, "first-non-nullable">;
export function defineOperation<T extends (...args: any[]) => any>(
  name: string,
  strategy: "sequential",
): Operation<T, "sequential">;
export function defineOperation<T extends (...args: any[]) => any>(
  name: string,
  strategy: "chained",
): Operation<T, "chained">;
export function defineOperation<T extends (...args: any[]) => any>(
  name: string,
  strategy: "standalone",
): Operation<T, "standalone">;
export function defineOperation<T extends (...args: any[]) => any>(
  name: string,
  strategy: ExecutionStrategy,
): Operation<T, ExecutionStrategy> {
  assert(!operations.has(name), `Operation "${name}" is already defined`);

  if (strategy === "standalone") {
    operations.set(name, {
      strategy,
    });
  } else {
    operations.set(name, {
      strategy,
      handlers: [],
    });
  }

  return {
    name: name,
    signature: null as unknown as T,
    strategy: strategy,
  };
}

/**
 * Adds a handler for a specific operation.
 *
 * @param {Operation} operationKey A reference the the operation being handled
 * @param {T} handler The handler. It is typed according to the signature given by the
 * `defineOperation` type parameter
 *
 * @example
 *
 * addHandler(logOperation, (message) => console.log(message));
 *
 * addHandler(fetchOperation, async (url) => {
 *    return await fetch(url);
 * });
 */
export const addHandler = <
  T extends (...args: any[]) => any,
  U extends ExecutionStrategy,
>(operationKey: Operation<T, U>, handler: NoInfer<T>): void => {
  const operationName = operationKey.name;
  const operation = operations.get(operationName);
  assertExists(operation, `Operation "${operationName}" is not defined`);

  if (operation.strategy === "standalone") {
    operation.handler = handler;
  } else {
    operation.handlers.push(handler);
  }
};

/**
 * Performs a specific operation
 *
 * @example
 *
 * perform(logOperation, "Hello world"); // Type-safe: string argument, void return
 *
 * const response = perform(fetchOperation, "https://example.com"); // Type-safe: string argument, Promise<Response> return
 */
// TODO: TS 5.8 should narrow the conditional return type without error
export const perform = <
  T extends (...args: any[]) => any,
  U extends ExecutionStrategy,
>(
  operationKey: Operation<T, U>,
  ...args: Parameters<T>
): U extends "standalone" ? ReturnType<T>
  : U extends "first" ? ReturnType<T> | null
  : U extends "first-non-nullable" ? NonNullable<ReturnType<T>>
  : U extends "sequential" ? void
  : U extends "chained" ? ReturnType<T>
  : never => {
  const operationName = operationKey.name;
  const operation = operations.get(operationName);

  assertExists(operation, `Operation "${operationName}" is not defined`);

  const strategy = operation.strategy;

  if (strategy === "standalone") {
    const handler = operation.handler;
    assertExists(handler, `No handler for operation "${operationName}"`);

    return handler(...args);
  }

  assert(
    operation.handlers.length > 0,
    `No handlers for operation "${operationName}"`,
  );

  switch (strategy) {
    case "first":
    case "first-non-nullable":
      for (const handler of operation.handlers) {
        const result = handler(...args);
        if (result !== null && result !== undefined) {
          // @ts-ignore ts 5.8
          return result as NonNullable<ReturnType<T>>;
        }
      }
      if (strategy === "first") {
        // @ts-ignore ts 5.8
        return null;
      }
      throw new Error(`No non-null handler for operation "${operationName}"`);

    case "sequential":
      operation.handlers.map((h) => h(...args)) as ReturnType<T>[];
      // @ts-ignore ts 5.8
      return;

    case "chained": {
      let result = operation.handlers[0]!(...args);
      for (const handler of operation.handlers.slice(1)) {
        result = handler(result);
      }
      // @ts-ignore ts 5.8
      return result as ReturnType<T>;
    }
    default:
      throw new Error(`Unknown execution strategy "${strategy}"`);
  }
};
