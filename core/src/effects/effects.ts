import { assert } from "@std/assert";
import type { MaybePromise } from "../types.d.ts";

const effectNameSymbol = Symbol.for("effect-name");
const effectScopes: EffectHandlerScope[] = [];
const effects = new Set();

export type EffectHandlers = Record<string, any>;

export type EffectDefinition<T> = {
  [K in keyof T]: T[K] extends (...args: infer Params) => infer Return
    ? (...args: Params) => Promise<Return>
    : never;
};

export const createEffect = <Ops>(name: string): EffectDefinition<Ops> => {
  assert(!effects.has("name"), `An effect named "${name}" is already defined`);

  return new Proxy({}, {
    get(_, prop: string | typeof effectNameSymbol) {
      if (prop === effectNameSymbol) return name;
      return (...payload: unknown[]) => perform(`${name}/${prop}`, ...payload);
    },
  }) as EffectDefinition<Ops>;
};

export const createHandlers = <Ops extends {}>(
  effect: EffectDefinition<Ops>,
  handlers: NoInfer<Ops>,
): EffectHandlers => {
  // @ts-ignore the effect proxy knows its name
  const effectName = effect[effectNameSymbol] as string;
  const target: Record<string, any> = {};

  for (const [operation, handler] of Object.entries(handlers)) {
    target[`${effectName}/${operation}`] = handler;
  }

  return target;
};

export const runWithHandlers = async <T>(
  fn: () => MaybePromise<T>,
  handlers: Record<string, Function>,
): Promise<T> => {
  const currentScope = effectScopes.at(-1);
  const scope = new EffectHandlerScope(currentScope);
  effectScopes.push(scope);

  for (const [type, handler] of Object.entries(handlers)) {
    scope.register(type, handler);
  }

  try {
    return await fn();
  } finally {
    effectScopes.pop();
  }
};

const perform = <Result>(
  type: string,
  ...payload: unknown[]
): Promise<Result> => {
  const currentScope = effectScopes.at(-1);
  const effect = new EffectPromise<Result>(type, payload);

  assert(currentScope?.handle(effect), `Unhandled effect "${type}"`);

  return effect.promise;
};

class EffectPromise<Result> {
  readonly type: string;
  readonly payload: unknown[];

  constructor(type: string, payload: unknown[]) {
    this.type = type;
    this.payload = payload;

    const { resolve, reject, promise } = Promise.withResolvers<Result>();

    this.promise = promise;
    this.resolve = resolve;
    this.reject = reject;
  }

  promise: Promise<Result>;
  resolve: (value: Result) => void;
  reject: (reason?: any) => void;
}

// Handler-registry
class EffectHandlerScope {
  #parent: EffectHandlerScope | undefined;
  #handlers = new Map<string, Function>();

  constructor(parent?: EffectHandlerScope) {
    this.#parent = parent;
  }

  register(type: string, handler: Function) {
    this.#handlers.set(type, handler);
  }

  handle<Result>(effect: EffectPromise<Result>): boolean {
    if (this.#handlers.has(effect.type)) {
      const handler = this.#handlers.get(effect.type)!;

      // @ts-ignore Promise.try is not typed in VSCode
      Promise.try(handler, ...effect.payload)
        .then((result: Result) => effect.resolve(result))
        .catch((reason?: any) => effect.reject(reason));

      return true;
    }

    if (this.#parent) {
      return this.#parent.handle(effect);
    }

    return false;
  }
}
