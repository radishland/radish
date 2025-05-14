import { assert, assertExists } from "@std/assert";

/**
 * The list of current scopes.
 *
 * You do not interact with it directly. It is managed by {@linkcode runWith}
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
 * @internal
 */
export const perform = <P extends any[], R>(
  id: string,
  ...payload: P
): Promise<R> => {
  const currentScope = handlerScopes.at(-1);
  assertExists(
    currentScope,
    `Effect "${id}" running outside of a HandlerScope. Use "runWith"`,
  );
  return currentScope.handle<P, R>(id, ...payload);
};

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

  getPayload(): P {
    return this.#payload;
  }
}

/**
 * A `HandlerScope` is where handlers are registered and ran.
 *
 * This class is responsible for finding handlers in scope for a given effect.
 * `HandlerScope`s  have a parent-child relation and _being in scope_ means being in the current scope or any or its parent scopes.
 *
 * Will throw if no handlers are in scope when trying to {@linkcode handle} an effect
 *
 * `HandlerScopes` are not instantiated directly, but are created when running {@linkcode runWith}
 *
 * @internal
 */
export class HandlerScope {
  #parent: HandlerScope | undefined;
  #handlers = new Map<string, Handler<any, any>>();

  constructor(parent?: HandlerScope) {
    this.#parent = parent;
  }

  addHandlers(handlers: Handlers) {
    const handlersById = Object.groupBy(handlers, ({ id }) => id);
    const handlersEntries = Object.entries(handlersById)
      .filter(([_k, v]) => v !== undefined)
      .map(([key, _handlers]): [string, Handler<any, any>[]] => {
        return [key, _handlers!];
      });

    for (let [id, _handlers] of handlersEntries) {
      const currentHandler = this.#handlers.get(id);
      _handlers = currentHandler ? [..._handlers, currentHandler] : _handlers;

      const newHandler = Handler.fold(_handlers);
      this.#handlers.set(id, newHandler);
    }
  }

  async handle<P extends any[], R>(id: string, ...payload: P): Promise<R> {
    if (this.#handlers.has(id)) {
      const handler: Handler<P, R> = this.#handlers.get(id)!;
      const result: R | Continue<P> = await handler.run(...payload);

      if (!(result instanceof Continue)) {
        return result;
      }

      if (this.#parent) {
        return this.#parent.handle(id, ...result.getPayload());
      }

      throw new Error(
        `Handling effect "${id}" returned \`Continue\`. Make sure the handlers sequence contains a terminal handler`,
      );
    }

    if (this.#parent) {
      return this.#parent.handle(id, ...payload);
    }

    throw new Error(`Unhandled effect "${id}"`);
  }
}

/**
 * Creates a new {@linkcode HandlerScope} where the passed handlers are registered, and executes the provided effectful program with the handlers in scope
 *
 * The provided handlers are only in scope inside the
 *
 * @example Ordering handlers
 *
 * The ordering of the handlers matters when they rely on delegation via {@linkcode Handler.continue}
 *
 * ```ts
 * import { runWith } from 'radish/effects';
 *
 * runWith(async () => {
 *   const txtFile = await io.read("hello.txt"); // "I can only handle .txt files"
 *   const jsonFile = await io.read("hello.json"); // ...
 * }, [handleTXTOnly, handleReadOp])
 * ```
 *
 * @param fn The effectful program to run
 * @param handlers A list of handlers implementing **all** the effects performed by the program
 *
 * @throws Throws "Unhandled effect" when an effect is performed with no handler in scope
 *
 * @see {@linkcode addHandlers}
 */
export const runWith = async <T>(
  fn: () => MaybePromise<T>,
  handlers: Handlers,
): Promise<T> => {
  const currentScope = handlerScopes.at(-1);
  const scope = new HandlerScope(currentScope);

  handlerScopes.push(scope);
  scope.addHandlers(handlers);

  try {
    return await fn();
  } finally {
    handlerScopes.pop();
  }
};

/**
 * Adds a list of handlers to the current {@linkcode HandlersScope}
 *
 * @param handlers The list of handlers to attach to the current scope
 *
 * @throws It there is no current {@linkcode HandlerScope}
 */
export const addHandlers = (handlers: Handlers): void => {
  const currentScope = handlerScopes.at(-1);

  if (!currentScope) {
    throw new Error('"addHandlers" called outside of an effect scope');
  }

  currentScope.addHandlers(handlers);
};
