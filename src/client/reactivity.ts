import { Signal } from "signal-polyfill";
import type {
  Destructor,
  EffectCallback,
  EffectOptions,
  ReactivityOptions,
} from "$types";

// @ts-ignore we're hiding get and set
export class ReactiveValue<T> extends Signal.State<T> {
  // @ts-ignore see above
  private override get;
  // @ts-ignore see above
  private override set;

  get value(): T {
    return super.get();
  }

  set value(newValue: T) {
    super.set(newValue);
  }
}

// @ts-ignore we're hiding get and set
export class ReactiveComputation<T> extends Signal.Computed<T> {
  // @ts-ignore see above
  private override get;

  get value(): T {
    return super.get();
  }
}

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

export const $object = <T extends Record<PropertyKey, any>>(
  init: T,
  options: ReactivityOptions = { deep: false },
): T => {
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

export const $array = <T extends ArrayLike<any>>(
  init: T,
  options: ReactivityOptions = { deep: false },
): T => {
  if (options.deep) {
    for (const [key, value] of Object.entries(init)) {
      init[key as keyof T] = maybeReactiveObjectType(value, options);
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

export const getValue = (signal: unknown): unknown => {
  if (isState(signal) || isComputed(signal)) {
    return signal.value;
  }
  return signal;
};

export const $state = <T>(
  initialValue: T,
  options?: Signal.Options<T | undefined>,
): ReactiveValue<T> => {
  return new ReactiveValue(initialValue, options);
};

export const $computed = <T>(
  computation: () => T,
  options?: Signal.Options<T>,
): ReactiveComputation<T> => {
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

/**
 * Create an unowned effect that must be cleanup up manually
 *
 * Accept an AbortSignal to abort the effect
 */
export const $effect = (
  cb: EffectCallback,
  options?: EffectOptions,
): Destructor => {
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
