import { Signal } from "signal-polyfill";

// @ts-ignore we hide get and set on purpose
export class ReactiveValue<T> extends Signal.State<T> {
  // @ts-ignore hide get method
  private override get;
  // @ts-ignore hide set method
  private override set;

  get value() {
    return super.get();
  }

  set value(newValue) {
    super.set(newValue);
  }
}

// @ts-ignore we hide get on purpose
export class ReactiveComputation<T> extends Signal.Computed<T> {
  // @ts-ignore hide get method
  private override get;

  get value() {
    return super.get();
  }
}

type ReactivityOptions = { deep: boolean };

const maybeReactiveObjectType = <T>(thing: T, options: ReactivityOptions) => {
  if (typeof thing === "object") {
    if (Array.isArray(thing)) {
      return $array(thing, options);
    } else if (thing) {
      return $object(thing, options);
    }
  }
  return thing;
};

export const $object = <T extends object & { [key: PropertyKey]: any }>(
  init: T,
  options: ReactivityOptions = { deep: false },
) => {
  if (options.deep === true) {
    for (const [key, value] of Object.entries(init)) {
      init[key as keyof T] = maybeReactiveObjectType(value, options);
    }
  }
  const state = new Signal.State(init);

  const proxy = new Proxy(init, {
    get(_target, p, _receiver) {
      return state.get()[p];
    },
    set(_target, p, newValue, _receiver) {
      state.set({
        ...state.get(),
        [p]: maybeReactiveObjectType(newValue, options),
      });
      return true;
    },
  });

  return proxy;
};

export const $array = <T>(
  init: T[],
  options: ReactivityOptions = { deep: false },
) => {
  if (options.deep) {
    for (const [key, value] of Object.entries(init)) {
      // @ts-ignore key in init
      init[key] = maybeReactiveObjectType(value, options);
    }
  }
  const state = new Signal.State(init);

  const proxy = new Proxy(init, {
    get(_target, p, _receiver) {
      // @ts-ignore state has p
      return state.get()[p];
    },
    set(_target, p, newValue, _receiver) {
      state.set({
        ...state.get(),
        [p]: maybeReactiveObjectType(newValue, options),
      });
      return true;
    },
  });

  return proxy;
};

export const isState = (
  s: unknown,
): s is InstanceType<typeof ReactiveValue> => {
  return Signal.isState(s);
};

export const isComputed = (
  s: unknown,
): s is InstanceType<typeof ReactiveComputation> => {
  return Signal.isComputed(s);
};

export const getValue = (signal: unknown) => {
  if (isState(signal) || isComputed(signal)) {
    return signal.value;
  }
  return signal;
};

export const $state = <T>(
  initialValue: T,
  options?: Signal.Options<T | undefined>,
) => {
  return new ReactiveValue(initialValue, options);
};

export const $computed = <T>(
  computation: () => T,
  options?: Signal.Options<T>,
) => {
  return new ReactiveComputation(computation, options);
};

let pending = false;

const watcher = new Signal.subtle.Watcher(() => {
  if (!pending) {
    pending = true;

    queueMicrotask(() => {
      pending = false;
      for (const s of watcher.getPending()) s.get();
      watcher.watch();
    });
  }
});

type Destructor = () => void;
export type EffectCallback = () => Destructor | void;
export type EffectOptions = {
  signal: AbortSignal;
};

/**
 * Create an unowned effect that must be cleanup up manually
 *
 * Accept an AbortSignal to abort the effect
 */
export const $effect = (
  cb: EffectCallback,
  options?: EffectOptions,
) => {
  if (options?.signal?.aborted) return () => {};

  let destroy: Destructor | undefined;
  const c = new Signal.Computed(() => {
    destroy?.();
    destroy = cb() ?? undefined;
  });
  watcher.watch(c);
  c.get();

  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    destroy?.();
    watcher.unwatch(c);
    cleaned = true;
  };

  options?.signal.addEventListener("abort", cleanup);

  return cleanup;
};
