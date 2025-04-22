import type { MaybePromise } from "../types.d.ts";

export const id = <T>(value: T) => value;

interface Functor<T> {
  map<U>(fn: (value: T) => U): Functor<U>;
}

interface Monad<T> {
  bind<U>(fn: (value: T) => Monad<U>): Monad<U>;
}

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

  static fold<P extends any[], R>(handlers: Handler<P, R>[]) {
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

export abstract class Option<T> {
  abstract map<U>(fn: (value: T) => U): Option<U>;
  abstract flatMap<U>(fn: (value: T) => Option<U>): Option<U>;

  abstract isSome(): this is Some<T>;
  abstract isNone(): this is None<T>;

  abstract getOrElse(defaultValue: T): T;

  abstract filter(predicate: (option: Option<T>) => boolean): Option<T>;
  abstract fold<R>(
    onNone: () => R,
    onSome: (value: T) => R,
  ): R;

  static some<T>(value: T): Option<T> {
    return new Some(value);
  }

  static none<T>(): Option<T> {
    return new None();
  }
}

class Some<T> extends Option<T> {
  #value: T;

  get value(): T {
    return this.#value;
  }

  constructor(value: T) {
    super();
    this.#value = value;
  }

  override map<U>(fn: (v: T) => U): Some<U> {
    return new Some(fn(this.#value));
  }

  override flatMap<U>(fn: (v: T) => Option<U>): Option<U> {
    return fn(this.#value);
  }

  override isSome(): this is Some<T> {
    return true;
  }

  override isNone(): this is None<T> {
    return false;
  }

  override getOrElse(_defaultValue: T): T {
    return this.#value;
  }

  override filter(predicate: (option: Option<T>) => boolean): Option<T> {
    return predicate(this) ? this : new None();
  }

  override fold<R>(
    _onNone: () => R,
    onSome: (value: T) => R,
  ): R {
    return onSome(this.#value);
  }

  override toString(): string {
    return `Some(${this.#value})`;
  }
}

class None<T> extends Option<T> {
  override map<U>(_fn: (value: T) => U): Option<U> {
    return new None();
  }

  override flatMap<U>(_fn: (value: T) => Option<U>): Option<U> {
    return new None();
  }

  override isSome(): this is Some<T> {
    return false;
  }

  override isNone(): this is None<T> {
    return true;
  }

  override getOrElse<U>(defaultValue: U): U {
    return defaultValue;
  }

  override filter(
    _predicate: (option: Option<T>) => boolean,
  ): Option<T> {
    return this;
  }

  override fold<R>(
    onNone: () => R,
    _onSome: (value: T) => R,
  ): R {
    return onNone();
  }

  override toString(): string {
    return "None";
  }
}
