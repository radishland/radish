import { createEffect, type Effect, handlerFor } from "./effects.ts";
import { MissingHandlerScopeError } from "./errors.ts";
import { handlerScopes } from "./handlers.ts";

/**
 * Async State Operations
 */
export interface StateOps<T> {
  /**
   * Retrieves data
   */
  get: () => T | undefined;
  /**
   * Sets data
   */
  set: (state: T) => void;
  /**
   * Updates data
   */
  update: (updater: (old: T) => T) => void;
}

/**
 * Creates a new AsyncState that can be safely used without race conditions in all situations typically subject to context loss:
 * - `await`
 * - `Promise.then`
 * - `setTimeout`
 * - `queueMicrotask`
 *
 * When the execution context happens in a different scope or macrotask (like with `setTimeout`) you can capture the whole effect {@linkcode HandlerScope HandlerScopes} stack with {@linkcode Snapshot} and restore it using the snapshot.
 *
 * @example Avoid race conditions in async flows
 *
 * ```ts
 * using _ = new HandlerScope();
 *
 * const processRequest = async (x: id) => {
 *   const state = createState("requestId", x);
 *   await delay(1); // do some async work
 *   await state.update((x) => x * 2); // update state for demo purposes
 *   return await state.get(); // retrieve the state later on
 * };
 *
 * await Promise.all([1, 2, 3].map(processRequest)); // [2, 4, 6] as expected
 * ```
 * @example Snapshot state and schedule async work
 *
 * ```ts
 * using _ = new HandlerScope();
 *
 *    // typically abstracted in a function
 *    {
 *      const state = createState("user", { id: "A" });
 *      const snapshot = Snapshot();
 *
 *      setTimeout(async () => {
 *        using _ = snapshot();
 *        const user = await state.get();
 *        assertEquals(user, { id: "A" }); // as expected
 *      }, 20);
 *    }
 *
 *    {
 *      const state = createState("user", { id: "B" });
 *      const snapshot = Snapshot();
 *
 *      setTimeout(async () => {
 *        using _ = snapshot();
 *        const user = await state.get();
 *        assertEquals(user, { id: "B" });
 *      }, 10); // no collisions
 *    }
 * ```
 *
 * @param key A key to name the state, used for storage and debugging purposes
 * @param initialValue The initial value of the state or `undefined` if none is provided
 *
 * @throws {MissingHandlerScopeError} If the state is created outside a {@linkcode HandlerScope}
 */
export const createState = <T>(key: string, initialValue?: T): {
  get: () => Effect<T | undefined>;
  set: (state: T) => Effect<void>;
  update: (updater: (old: T) => T) => Effect<void>;
} => {
  const scope = handlerScopes.at(-1);
  if (!scope) throw new MissingHandlerScopeError();

  const id = `${key}:${Date.now()}:${Math.random()}`;
  const store = scope.store;

  const get = createEffect<StateOps<T>["get"]>(`state/get/${id}`);
  const set = createEffect<StateOps<T>["set"]>(`state/set/${id}`);
  const update = createEffect<StateOps<T>["update"]>(`state/update/${id}`);

  store.set(id, initialValue);

  const handlers = [
    handlerFor(get, () => {
      return store.get(id);
    }),
    handlerFor(set, (newState) => {
      store.set(id, newState);
    }),
    handlerFor(update, (updater) => {
      const oldState = store.get(id);
      const newState = updater(oldState);
      store.set(id, newState);
    }),
  ];

  scope.addHandlers(handlers);

  return {
    get,
    set,
    update,
  };
};
