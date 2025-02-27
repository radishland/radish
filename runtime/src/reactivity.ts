import { Signal } from "signal-polyfill";
import type {
  Destructor,
  EffectCallback,
  EffectOptions,
  ReactivityOptions,
} from "./types.d.ts";
import {
  effect as _effect,
  Signal as _Signal,
  signal as _signal,
} from "@preact/signals-core";

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
  value: unknown,
): value is InstanceType<typeof _Signal> => {
  return value instanceof _Signal;
};

export const getValue = (signal: unknown): unknown => {
  if (isState(signal)) {
    return signal.value;
  }
  return signal;
};

export const signal = <T>(value: T) => {
  return _signal(value);
};

export const $computed = <T>(
  computation: () => T,
  options?: Signal.Options<T>,
): ReactiveComputation<T> => {
  return new ReactiveComputation(computation, options);
};

/**
 * Create an unowned effect that must be cleanup up manually
 *
 * Accept an AbortSignal to abort the effect
 */
export const effect = (
  cb: EffectCallback,
  options?: EffectOptions,
): Destructor => {
  if (options?.signal?.aborted) return () => {};

  const dispose = _effect(cb);
  options?.signal.addEventListener("abort", dispose);

  return dispose;
};
