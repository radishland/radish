import { createEffect, handlerFor } from "./effects.ts";
import { MissingHandlerScopeError } from "./errors.ts";
import { handlerScopes } from "./handlers.ts";

interface StateOps<T> {
  get: () => T | undefined;
  set: (state: T) => void;
  update: (updater: (old: T) => T) => void;
}

export const createState = <T>(key: string, initialValue: T) => {
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
