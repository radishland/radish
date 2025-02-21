import { Signal } from "signal-polyfill";

export class ReactiveValue extends Signal.State {
  get;
  set;

  get value() {
    return super.get();
  }

  set value(newValue) {
    super.set(newValue);
  }
}

export class ReactiveComputation extends Signal.Computed {
  get;

  get value() {
    return super.get();
  }
}

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

export const $object = (
  init,
  options = { deep: false },
) => {
  if (options.deep === true) {
    for (const [key, value] of Object.entries(init)) {
      init[key] = maybeReactiveObjectType(value, options);
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

export const $array = (
  init,
  options = { deep: false },
) => {
  if (options.deep) {
    for (const [key, value] of Object.entries(init)) {
      init[key] = maybeReactiveObjectType(value, options);
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

export const isState = (
  s,
) => {
  return Signal.isState(s);
};

export const isComputed = (
  s,
) => {
  return Signal.isComputed(s);
};

export const getValue = (signal) => {
  if (isState(signal) || isComputed(signal)) {
    return signal.value;
  }
  return signal;
};

export const $state = (
  initialValue,
  options,
) => {
  return new ReactiveValue(initialValue, options);
};

export const $computed = (
  computation,
  options,
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

export const $effect = (
  cb,
  options,
) => {
  if (options?.signal?.aborted) return () => {};

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
