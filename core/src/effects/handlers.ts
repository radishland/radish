import type { MaybePromise } from "../types.d.ts";

export type BaseHandler<P extends any[], R> = (...payload: P) => MaybePromise<
  R | Continue<P>
>;

type HandlerResult<P extends any[], R> = ReturnType<BaseHandler<P, R>>;

export class Handler<P extends any[], R> {
  #handle: BaseHandler<P, R>;

  constructor(handle: BaseHandler<P, R>) {
    this.#handle = handle;
  }

  async run(...payload: P): Promise<R | Continue<P>> {
    // @ts-ignore Promise.try
    return await Promise.try(this.#handle, ...payload);
  }

  flatMap(f: BaseHandler<P, R>): Handler<P, R> {
    return new Handler(async (...payload: P) => {
      const result = await this.run(...payload);

      if (!(result instanceof Continue)) return result;
      return f(...result.getPayload());
    });
  }

  static fold<P extends any[], R>(handlers: Handler<P, R>[]): Handler<P, R> {
    return handlers.reduce((acc, curr) =>
      acc.flatMap((...args) => curr.run(...args))
    );
  }

  /**
   * Lifts a BaseHandler into the Handler class
   */
  static of<P extends any[], R>(handle: BaseHandler<P, R>): Handler<P, R> {
    return new Handler(handle);
  }

  static continue<P extends any[]>(...payload: P): Continue<P> {
    return new Continue(...payload);
  }
}

abstract class BaseContinue<P extends any[], R> {
  abstract map<S>(f: (r: R) => S): HandlerResult<P, S>;
  abstract flatMap(f: BaseHandler<P, R>): HandlerResult<P, R>;
}

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
