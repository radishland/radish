/**
 * The polymorphic identity
 */
export const id = <T>(value: T): T => value;

interface Functor<T> {
  map<U>(fn: (value: T) => U): Functor<U>;
}

interface Monad<T> {
  bind<U>(fn: (value: T) => Monad<U>): Monad<U>;
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
