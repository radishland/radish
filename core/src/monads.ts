abstract class Option<T> {
  abstract map<U>(fn: (value: T) => U): Option<U>;
  abstract flatMap<U>(fn: (value: T) => Option<U>): Option<U>;

  abstract isSome(): this is Some<T>;
  abstract isNone(): this is None;

  abstract getOrElse(defaultValue: T): T;

  static some<T>(value: T) {
    return new Some(value);
  }

  static none() {
    return None.instance;
  }
}

class Some<T> extends Option<T> {
  #value: T;

  constructor(value: T) {
    super();
    this.#value = value;
  }

  override map<U>(fn: (v: T) => U) {
    return new Some(fn(this.#value));
  }

  override flatMap<U>(fn: (v: T) => Some<U>): Some<U> {
    return fn(this.#value);
  }

  override isSome(): this is Some<T> {
    return true;
  }

  override isNone(): this is None {
    return false;
  }

  override getOrElse(_defaultValue: T): T {
    return this.#value;
  }
}

class None extends Option<never> {
  static instance = new None();

  private constructor() {
    super();
  }

  override map(): None {
    return this;
  }

  override flatMap(): None {
    return this;
  }

  override isSome(): this is Some<never> {
    return false;
  }

  override isNone(): this is None {
    return true;
  }

  override getOrElse<U>(defaultValue: U): U {
    return defaultValue;
  }
}
