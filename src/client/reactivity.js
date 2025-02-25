/**
 * @import {Destructor, EffectCallback, EffectOptions, ReactivityOptions} from "$types"
 */

import { Signal } from "signal-polyfill";

/**
 * @template T
 * @extends Signal.State<T>
 */
// @ts-ignore we're hiding get and set
export class ReactiveValue extends Signal.State {
  /**
   * @private
   */
  // @ts-ignore see above
  get;

  /** @private  */
  // @ts-ignore see above
  set;

  get value() {
    return super.get();
  }

  set value(newValue) {
    super.set(newValue);
  }
}

/**
 * @template T
 * @extends Signal.Computed<T>
 */
// @ts-ignore we're hiding get and set
export class ReactiveComputation extends Signal.Computed {
  /** @private */
  // @ts-ignore see above
  get;

  get value() {
    return super.get();
  }
}

/**
 * @template T
 * @param {T} thing
 * @param {ReactivityOptions} options
 */
const maybeReactiveObjectType = (thing, options) => {
  if (typeof thing === "object") {
    if (Array.isArray(thing)) {
      return $array(thing, options);
    } else if (thing) {
      return $object(thing, options);
    }
  }
  return thing;
};

/**
 * @template {Record<PropertyKey, any>} T
 * @param {T} init
 * @param {ReactivityOptions} options
 */
export const $object = (
  init,
  options = { deep: false },
) => {
  if (options.deep === true) {
    for (const [key, value] of Object.entries(init)) {
      /** @type {keyof T} */
      const k = key;
      init[k] = maybeReactiveObjectType(value, options);
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

/**
 * @template T
 * @param {T[]} init
 * @param {ReactivityOptions} options
 */
export const $array = (
  init,
  options = { deep: false },
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

/**
 * @param {unknown} s
 * @returns {s is InstanceType<typeof ReactiveValue>}
 */
export const isState = (s) => {
  return Signal.isState(s);
};

/**
 * @param {unknown} s
 * @returns {s is InstanceType<typeof ReactiveComputation>}
 */
export const isComputed = (s) => {
  return Signal.isComputed(s);
};

/**
 * @param {unknown} signal
 */
export const getValue = (signal) => {
  if (isState(signal) || isComputed(signal)) {
    return signal.value;
  }
  return signal;
};

/**
 * @template T
 * @param {T} initialValue
 * @param {Signal.Options<T | undefined>|undefined} [options]
 */
export const $state = (initialValue, options) => {
  return new ReactiveValue(initialValue, options);
};

/**
 * @template T
 * @param {()=>T} computation
 * @param {Signal.Options<T>|undefined} [options]
 */
export const $computed = (computation, options) => {
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
 *
 * @param {EffectCallback} cb
 * @param  {EffectOptions|undefined} [options]
 */
export const $effect = (cb, options) => {
  if (options?.signal?.aborted) return () => {};

  /** @type {Destructor | undefined} */
  let destroy;
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
