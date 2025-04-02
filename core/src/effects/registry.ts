import { assert, assertExists } from "@std/assert";

type ExecutionStrategy = "first" | "sequential" | "chained";

// Phantom type parameters preserve the type information defining handlers' signatures
interface OperationKey<T> {
  readonly __name: string;
  readonly __type: T;
  readonly __strategy: ExecutionStrategy;
}

const operations = new Map<
  string,
  { strategy: ExecutionStrategy; handlers: Function[] }
>();

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
 * const fetchOperation = defineOperation<(url: string) => Promise<Response>>("fetch", "first");
 */
export const defineOperation = <T>(
  name: string,
  strategy: ExecutionStrategy,
): OperationKey<T> => {
  assert(!operations.has(name), `Operation "${name}" is already defined`);

  operations.set(name, { strategy: strategy, handlers: [] });

  return {
    __name: name,
    __type: null as unknown as T,
    __strategy: strategy,
  };
};

/**
 * Adds a handler for a specific operation.
 *
 * @param {OperationKey} operationKey A reference the the operation being handled
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
export const addHandler = <T extends (...args: any[]) => any>(
  operationKey: OperationKey<T>,
  handler: T,
): void => {
  const operationName = operationKey.__name;
  const operation = operations.get(operationName);
  assertExists(operation, `Operation "${operationName}" is not defined`);

  operation.handlers.push(handler);
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
export const perform = <T extends (...args: any[]) => any>(
  operationKey: OperationKey<T>,
  ...args: Parameters<T>
): ReturnType<T> | ReturnType<T>[] | null => {
  const operationName = operationKey.__name;
  const operation = operations.get(operationName);

  assertExists(operation, `Operation "${operationName}" is not defined`);
  assert(
    operation.handlers.length > 0,
    `No handlers for operation "${operationName}"`,
  );

  switch (operation.strategy) {
    case "first":
      for (const handler of operation.handlers) {
        const result = handler(...args);
        if (result !== null && result !== undefined) {
          return result as ReturnType<T>;
        }
      }
      return null;
    case "sequential":
      return operation.handlers.map((h) => h(...args)) as ReturnType<T>[];

    case "chained": {
      let result = operation.handlers[0]!(...args);
      for (const handler of operation.handlers.slice(1)) {
        result = handler(result);
      }
      return result as ReturnType<T>;
    }
    default:
      throw new Error(`Unknown execution strategy "${operation.strategy}"`);
  }
};
