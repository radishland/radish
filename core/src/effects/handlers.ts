import type { MaybePromise } from "../types.d.ts";

export type HandlerResult<P extends any[], R> = MaybePromise<
  Done<R> | Continue<P>
>;

export type BaseHandler<P extends any[], R> = (...payload: P) => MaybePromise<
  R | Continue<P>
>;

export class Handler<P extends any[], R> {
  #handle;

  constructor(handle: (...payload: P) => HandlerResult<P, R>) {
    this.#handle = handle;
  }

  async run(...payload: P): Promise<Done<R> | Continue<P>> {
    // @ts-ignore Promise.try
    return await Promise.try(this.#handle, ...payload);
  }

  flatMap(
    f: (...payload: P) => HandlerResult<P, R>,
  ): Handler<P, R> {
    return new Handler(async (...payload: P) => {
      const result = await this.run(...payload);

      if (result instanceof Done) return result;
      return f(...result.getPayload());
    });
  }

  static fold<P extends any[], R>(handlers: Handler<P, R>[]): Handler<P, R> {
    return handlers.reduce((acc, curr) =>
      acc.flatMap((...args) => curr.run(...args))
    );
  }

  /**
   * Lifts a BaseHandler into the Handler class, allowing pattern matching on its result
   */
  static of<P extends any[], R>(handle: BaseHandler<P, R>): Handler<P, R> {
    return new Handler(async (...args: P) => {
      // @ts-ignore Promise.try
      const result: R | Continue<P> = await Promise.try(handle, ...args);
      if (result instanceof Continue || result instanceof Done) {
        return result;
      }
      return new Done(result);
    });
  }

  static continue<P extends any[]>(...payload: P): Continue<P> {
    return new Continue(...payload);
  }
}

abstract class BaseHandlerResult<P extends any[], R> {
  abstract map<S>(f: (r: R) => S): HandlerResult<P, S>;
  abstract flatMap(
    f: (...payload: P) => HandlerResult<P, R>,
  ): HandlerResult<P, R>;
}

class Done<R> extends BaseHandlerResult<any[], R> {
  #result: R;

  constructor(result: R) {
    super();
    this.#result = result;
  }

  override map<S>(fn: (value: R) => S): Done<S> {
    return new Done(fn(this.#result));
  }

  override flatMap<Q extends any[]>(
    _f: (...payload: Q) => HandlerResult<Q, R>,
  ): HandlerResult<Q, R> {
    return this;
  }

  isDone(): this is Done<R> {
    return true;
  }

  getValue(): R {
    return this.#result;
  }
}

class Continue<P extends any[]> extends BaseHandlerResult<P, any> {
  #payload: P;

  constructor(...payload: P) {
    super();
    this.#payload = payload;
  }

  override map<S>(_fn: (r: any) => S): Continue<P> {
    return this;
  }

  override flatMap<R>(
    f: (...p: P) => HandlerResult<P, R>,
  ): HandlerResult<P, R> {
    // Passes control to the next handler
    return f(...this.#payload);
  }

  isDone(): this is Done<any> {
    return false;
  }

  getPayload(): P {
    return this.#payload;
  }
}
