import { assert } from "@std/assert";

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

type HandlerResult<P extends any[], R> = ReturnType<BaseHandler<P, R>>;

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
   */
  static continue<P extends any[]>(...payload: P): Continue<P> {
    return new Continue(...payload);
  }
}

abstract class BaseContinue<P extends any[], R> {
  abstract map<S>(f: (r: R) => S): HandlerResult<P, S>;
  abstract flatMap(f: BaseHandler<P, R>): HandlerResult<P, R>;
}

/**
 * @internal
 */
export class Continue<P extends any[]> extends BaseContinue<P, any> {
  #payload: P;

  constructor(...payload: P) {
    super();
    this.#payload = payload;
  }

  override map<S>(_fn: (r: any) => S): Continue<P> {
    return this;
  }

  override flatMap<R>(f: BaseHandler<P, R>): HandlerResult<P, R> {
    // Passes control to the next handler
    return f(...this.#payload);
  }

  getPayload(): P {
    return this.#payload;
  }
}
