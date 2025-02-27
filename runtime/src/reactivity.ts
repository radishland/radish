import {
  computed as _computed,
  effect as _effect,
  type ReadonlySignal,
  Signal as _Signal,
  signal as _signal,
} from "@preact/signals-core";
import { Signal } from "signal-polyfill";
import type { Destructor, EffectCallback, EffectOptions } from "./types.d.ts";

export const isState = (
  value: unknown,
): value is InstanceType<typeof _Signal> => {
  return value instanceof _Signal;
};

export const signal = <T>(value: T) => {
  return _signal(value);
};

export const computed = <T>(computation: () => T): ReadonlySignal<T> => {
  return _computed(computation);
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
  if (options?.signal.aborted) return () => {};

  const dispose = _effect(cb);
  options?.signal.addEventListener("abort", dispose);

  return dispose;
};

const deep = <T>(thing: T) => {
  if (typeof thing === "object") {
    if (Array.isArray(thing)) {
      return array(thing);
    } else if (thing) {
      return object(thing);
    }
  }
  return thing;
};

export const object = <T extends Record<PropertyKey, any>>(
  init: T,
): T => {
  for (const [key, value] of Object.entries(init) as [keyof T, any][]) {
    init[key] = deep(value);
  }
  const state = signal(init);

  const proxy = new Proxy(init, {
    get(_target, p, _receiver) {
      return state.value[p];
    },
    set(_target, p: keyof T, newValue, _receiver) {
      state.value = {
        ...state.value,
        [p]: deep(newValue),
      };
      return true;
    },
  });

  return proxy;
};

export const array = <T extends ArrayLike<any>>(
  init: T,
): T => {
  for (const [key, value] of Object.entries(init)) {
    init[key as keyof T] = deep(value);
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
        [p]: deep(newValue),
      });
      return true;
    },
  });

  return proxy;
};
