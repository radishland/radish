import { assert, assertEquals, assertExists } from "@std/assert";
import {
  MissingHandlerScopeError,
  MissingTerminalHandlerError,
  UnhandledEffectError,
} from "./errors.Ts";

/**
 * @internal
 */
type MaybePromise<T> = T | Promise<T>;

/**
 * Type of base handlers used in {@linkcode handlerFor}
 *
 * A `BaseHandler` can be synchronous, asynchronous, partial or total
 *
 * @see {@linkcode handlerFor}
 */
export type BaseHandler<P extends any[], R> = (...payload: P) => MaybePromise<
  R | Continue<P>
>;

/**
 * An array of handlers
 */
export type Handlers = Handler<any, any>[];

/**
 * The list of current scopes.
 *
 * This is managed automatically by {@linkcode HandlerScope}
 *
 * @internal
 */
export const handlerScopes: HandlerScope[] = [];

/**
 * Retrieves the current {@linkcode HandlerScope} and delegates the handling of the provided effect id
 *
 * @param id The id of the effect to handle in the current {@linkcode HandlerScope}
 * @param payload The payload to pass to the handler of the effect
 *
 * @throws {MissingHandlerScopeError} If the effect is ran outside of a {@linkcode HandlerScope}
 *
 * @internal
 */
export const perform = <P extends any[], R>(
  id: string,
  ...payload: P
): Promise<R> => {
  const currentScope = handlerScopes.at(-1);
  if (!currentScope) throw new MissingHandlerScopeError();

  return currentScope.handle<P, R>(id, ...payload);
};

/**
 * This class implements the monadic sequencing of handlers with {@linkcode flatMap} and {@linkcode fold}
 *
 * Developer-facing code will primarily interact with this class through the {@linkcode continue} method
 */
export class Handler<P extends any[], R> {
  /**
   * The effect id this handler is for
   */
  id: string;
  #handle: BaseHandler<P, R>;

  /**
   * Lifts a {@linkcode BaseHandler} into the monadic `Handler` class
   */
  constructor(id: string, handle: BaseHandler<P, R>) {
    this.id = id;
    this.#handle = handle;
  }

  /**
   * Runs a handler synchronous or asynchronously with `Promise.try`
   */
  async run(...payload: P): Promise<R | Continue<P>> {
    // @ts-ignore Promise.try
    return await Promise.try(this.#handle, ...payload);
  }

  /**
   * The monadic binding of handlers, where {@linkcode BaseHandler BaseHandlers} actually are Keisli arrows
   */
  flatMap(f: BaseHandler<P, R>): Handler<P, R> {
    return new Handler(this.id, async (...payload: P) => {
      const result = await this.run(...payload);

      if (!(result instanceof Continue)) return result;
      return f(...result.getPayload());
    });
  }

  /**
   * Turns a list of handlers into a single handler by sequencing them with {@linkcode flatMap}
   *
   * @throws {AssertionError} Throws if all handlers are not handling the same effect
   */
  static fold<P extends any[], R>(handlers: Handler<P, R>[]): Handler<P, R> {
    const ids = new Set(handlers.map((h) => h.id));
    assert(ids.size === 1, "Can't fold together handlers of different effects");

    return handlers.reduce((acc, curr) =>
      acc.flatMap((...args) => curr.run(...args))
    );
  }

  /**
   * This methods lets a handler delegate work to other handlers of the same effect
   *
   * In a handlers sequence there must always be a terminal handler, that is, a handler that is a total function and does not delegate.
   *
   * @throws If there is no terminal handler in the sequence
   */
  static continue<P extends any[]>(...payload: P): Continue<P> {
    return new Continue(...payload);
  }
}

/**
 * Represents delegation between handlers
 *
 * @internal
 */
export class Continue<P extends any[]> {
  #payload: P;

  constructor(...payload: P) {
    this.#payload = payload;
  }

  /**
   * Retrieves the payload to pass to the next handler in scope
   */
  getPayload(): P {
    return this.#payload;
  }
}

/**
 * A {@linkcode HandlerScope} creates a new scope where effects are handled
 *
 * The {@linkcode handle} method is responsible for finding handlers in scope for a given effect.
 *
 * {@linkcode HandlerScope}s  have a parent-child relation and a handler is _in scope_ if it is in the current scope or any of its parents.
 *
 * @example Creating a new {@linkcode HandlerScope}
 *
 * ```ts
 * {
 *   using _ = new HandlerScope(handleIO);
 *   const content = await io.read("path");
 * }
 *
 * // not in scope
 * await io.read("other/path"); // throws
 * ```
 *
 * @example Ordering handlers
 *
 * The order of the handlers matters when they rely on delegation via {@linkcode Handler.continue}
 *
 * ```ts
 * using _ = new HandlerScope(handleTXTOnly, handleReadOp);
 *
 * const txtFile = await io.read("hello.txt"); // "I can only handle .txt files"
 * const jsonFile = await io.read("hello.json"); // ...
 * ```
 *
 * @throws If no handlers are in scope when trying to {@linkcode handle} an effect
 */
export class HandlerScope {
  #parent: HandlerScope | undefined;
  #stack = new DisposableStack();
  #disposed = false;

  handlers = new Map<string, Handler<any, any>>();
  store = new Map();

  /**
   * Creates a new {@linkcode HandlerScope}
   *
   * @param handlers A list of handlers
   *
   * @throws Throws "Unhandled effect" when an effect is performed with no handler in scope
   *
   * @see {@linkcode addHandlers}
   */
  constructor(...handlers: Handlers) {
    const currentScope = handlerScopes.at(-1);
    this.#parent = currentScope;
    handlerScopes.push(this);

    this.addHandlers(handlers);
  }

  /**
   * Registers a list of handlers in the {@linkcode HandlerScope} instance
   *
   * @param handlers the handlers to register
   *
   * @internal
   */
  addHandlers(handlers: Handlers) {
    assert(!this.#disposed, "Can't add handlers to a disposed HandlerScope");

    const handlersById = Object.groupBy(handlers, ({ id }) => id);
    const handlersEntries = Object.entries(handlersById)
      .filter(([_k, v]) => v !== undefined)
      .map(([key, _handlers]): [string, Handler<any, any>[]] => {
        return [key, _handlers!];
      });

    for (let [id, _handlers] of handlersEntries) {
      const currentHandler = this.handlers.get(id);
      _handlers = currentHandler ? [..._handlers, currentHandler] : _handlers;

      const newHandler = Handler.fold(_handlers);
      this.handlers.set(id, newHandler);
    }
  }

  /**
   * Handles an effect by finding its handlers in scope
   *
   * @param id The `id` of the effect to handle
   * @param payload The payload to pass to the handler
   *
   * @throws {UnhandledEffectError} If there is no handler in scope for the effect
   * @throws {MissingTerminalHandlerError} If there is no terminal handler. This happens when all handlers return {@linkcode Handler.continue} and none returns
   *
   * @internal
   */
  async handle<P extends any[], R>(id: string, ...payload: P): Promise<R> {
    if (this.handlers.has(id)) {
      const handler: Handler<P, R> = this.handlers.get(id)!;
      const result: R | Continue<P> = await handler.run(...payload);

      if (!(result instanceof Continue)) {
        return result;
      }

      if (this.#parent) {
        return this.#parent.handle(id, ...result.getPayload());
      }

      throw new MissingTerminalHandlerError(id);
    }

    if (this.#parent) {
      return this.#parent.handle(id, ...payload);
    }

    throw new UnhandledEffectError(id);
  }

  /**
   * Adds a callback to be invoked when the {@linkcode HandlerScope} is disposed.
   */
  onDispose(cleanup: () => void) {
    this.#stack.defer(cleanup);
  }

  /**
   * Cleans up the {@linkcode HandlerScope} and restores its parent scope as the current scope
   *
   * @internal
   */
  [Symbol.dispose]() {
    if (this.#disposed) return;

    this.#disposed = true;
    handlerScopes.pop();

    this.#parent = undefined;
    this.handlers.clear();
    this.#stack.dispose();
  }
}

export const Snapshot = () => {
  const handlersMap = handlerScopes.map((
    scope,
  ) => [...scope.handlers.values()]);
  const stores = handlerScopes.map((scope) => scope.store);

  assertEquals(handlersMap.length, stores.length);

  return () => {
    let scope: HandlerScope | undefined;
    for (let index = 0; index < handlersMap.length; index++) {
      const handlers = handlersMap[index];
      const store = stores[index];

      assert(handlers);
      assert(store);

      scope = new HandlerScope(...handlers);
      scope.store = store;
    }

    assertExists(scope);
    return scope;
  };
};

/**
 * Adds a list of handlers to the current {@linkcode HandlersScope}
 *
 * @param handlers The list of handlers to attach to the current scope
 *
 * @throws {MissingHandlerScopeError} It there is no {@linkcode HandlerScope} to register handlers to
 */
export const addHandlers = (handlers: Handlers): void => {
  const currentScope = handlerScopes.at(-1);
  if (!currentScope) throw new MissingHandlerScopeError();

  currentScope.addHandlers(handlers);
};
