import {
  computed as _computed,
  effect as _effect,
  type ReadonlySignal,
  Signal,
  signal as _signal,
} from "@preact/signals-core";
import type { Destructor, EffectCallback, EffectOptions } from "./types.d.ts";
import { type } from "./utils.ts";

export const isState = (
  value: unknown,
): value is InstanceType<typeof Signal> => {
  return value instanceof Signal;
};

/**
 * Creates a new signal
 *
 * @param value The initial value
 */
export const signal = <T>(value: T): Signal<T> => {
  return _signal(value);
};

/**
 * Creates a read-only computed signal based on the values of other signals
 *
 * The computed value is updated when a tracked dependency changes
 *
 * @param computation The callback function doing the computation
 */
export const computed = <T>(computation: () => T): ReadonlySignal<T> => {
  return _computed(computation);
};

/**
 * Creates an unowned effect that must be cleaned up manually and runs arbitrary code in response to signals change.
 *
 * @param cb The effect callback to run when a tracked dependency changes. Can return a cleanup function, executed when the effect is re-run or is disposed of.
 *
 * @param options An AbortSignal can be passed to abort the effect
 *
 * @return a function to unsubscribe and cleanup the effect
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

/**
 * Creates a deeply reactive proxied object or array
 *
 * @example  const obj = reactive({ a: { b: { c: 1 } } });
  const computation = computed(() => obj.a.b.c * 2});

  assertEquals(computation.value, 2);
  obj.a.b.c = 2;
  assertEquals(computation.value, 4);
 */
export const reactive = <T>(thing: T): T => {
  if (type(thing) === "object" || type(thing) === "array") {
    // @ts-ignore we've already enforced the type
    return object(thing);
  }
  return thing;
};

const object = <T extends Record<PropertyKey, any>>(
  init: T,
): T => {
  for (const [key, value] of Object.entries(init) as [keyof T, any][]) {
    init[key] = reactive(value);
  }
  const state = signal(init);

  const proxy = new Proxy(init, {
    get(_target, p, _receiver) {
      return state.value[p];
    },
    set(_target, p: keyof T, newValue, _receiver) {
      state.value = {
        ...state.value,
        [p]: reactive(newValue),
      };
      return true;
    },
  });

  return proxy;
};
