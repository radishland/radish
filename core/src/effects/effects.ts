import { assertExists } from "@std/assert";
import type { Equals } from "@fcrozatier/ts-helpers";
import type { MaybePromise } from "../types.d.ts";
import { Option } from "../utils/algebraic-structures.ts";

// [Implementation note]: effects and handlers are parametrized by the 'type' property

type WithType<A> =
  & A
  & {
    readonly type: string;
  };

export type EffectHandler<P extends any[], R> = (
  ...payload: P
) => MaybePromise<R | Option<R>>;

type EffectHandlerWithType<P extends any[], R> = WithType<EffectHandler<P, R>>;

export type EffectHandlers = EffectHandlerWithType<any, any>[];

export type EffectTransformer<P> = (payload: P) => MaybePromise<P | Option<P>>;

type EffectTransformerWithType<P> = WithType<EffectTransformer<P>>;

export type EffectTransformers = EffectTransformerWithType<any>[];

type EffectRunner<P extends any[], R> = WithType<(...payload: P) => Effect<R>>;
type TransformEffectRunner<P> = WithType<(payload: P) => TransformEffect<P>>;

const effectScopes: EffectHandlerScope[] = [];

export class Effect<A> implements PromiseLike<A> {
  perform: () => Promise<A>;

  constructor(perform: () => Promise<A>) {
    this.perform = perform;
  }

  then<TResult1 = A, TResult2 = never>(
    onfulfilled?:
      | ((value: A) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.perform().then(onfulfilled, onrejected);
  }

  static resolve<A>(a: A): Effect<A> {
    return new Effect(() => Promise.resolve(a));
  }

  bind<B>(f: (a: A) => Effect<B>): Effect<B> {
    return new Effect(() => this.perform().then((a) => f(a).perform()));
  }

  map<B>(f: (a: A) => B): Effect<B> {
    return this.bind((a) => Effect.resolve(f(a)));
  }
}

class TransformEffect<A> extends Effect<A> {}

// Effect creator
export function createEffect<Op extends (...payload: any[]) => any>(
  type: string,
): EffectRunner<Parameters<Op>, ReturnType<Op>> {
  const effectRunner = (...payload: Parameters<Op>): Effect<ReturnType<Op>> => {
    return new Effect(() => perform(type, ...payload));
  };

  Object.defineProperty(effectRunner, "type", { value: type, writable: false });

  return effectRunner as EffectRunner<Parameters<Op>, ReturnType<Op>>;
}

/**
 * Creates a transform effect.
 *
 * Since transformers (handlers of transform effects) are sequenced, make sure
 * they are endomorphisms: their signature is like T -> T with inputs and outputs
 * of the same type
 */
export function createTransformEffect<Op extends (payload: any) => any>(
  type: string,
): Equals<Parameters<Op>[0], ReturnType<Op>> extends true
  ? TransformEffectRunner<ReturnType<Op>>
  : never {
  const effectRunner = (payload: Parameters<Op>) => {
    return new TransformEffect(() => transform(type, payload));
  };

  Object.defineProperty(effectRunner, "type", { value: type, writable: false });

  // @ts-ignore TS 5.8 conditional
  return effectRunner as TransformEffectRunner<ReturnType<Op>>;
}

const perform = <P extends any[], R>(
  type: string,
  ...payload: P
): Promise<R> => {
  const currentScope = effectScopes.at(-1);
  assertExists(
    currentScope,
    `Effect "${type}" should run inside a handler scope. Use runWith`,
  );
  return currentScope.handle<P, R>(type, ...payload);
};

const transform = <P>(type: string, payload: P): Promise<P> => {
  const currentScope = effectScopes.at(-1);
  assertExists(
    currentScope,
    `Transform "${type}" should run inside a handler scope. Use runWith`,
  );
  return currentScope.transform<P>(type, payload);
};

export const handlerFor = <P extends any[], R>(
  effectRunner: EffectRunner<P, R>,
  handler: NoInfer<EffectHandler<P, R>>,
): EffectHandlerWithType<P, R> => {
  const { type } = effectRunner;
  Object.defineProperty(handler, "type", { value: type, writable: false });
  return handler as EffectHandlerWithType<P, R>;
};

export const transformerFor = <P>(
  effectRunner: TransformEffectRunner<P>,
  transformer: NoInfer<EffectTransformer<P>>,
): EffectTransformerWithType<P> => {
  const { type } = effectRunner;
  Object.defineProperty(transformer, "type", { value: type, writable: false });
  return transformer as EffectTransformerWithType<P>;
};

/**
 * Handlers are dependent on scope, yielding a stratified structure
 *
 * Note: more precisely, handlers override each other from scope to scope giving a pre-sheaf
 * over the scopes pre-order category. More succinctly, we've got a fibration over scopes
 */
class EffectHandlerScope {
  #parent: EffectHandlerScope | undefined;
  #handlers = new Map<string, EffectHandler<any, any>[]>();
  #transformers = new Map<string, EffectTransformer<any>[]>();

  constructor(parent?: EffectHandlerScope) {
    this.#parent = parent;
  }

  addHandlers(handlers: EffectHandlers = []) {
    if (handlers.length === 0) return;

    const handlersByType = Object.groupBy(handlers, ({ type }) => type);
    const handlersEntries = Object.entries(handlersByType)
      .filter(([_k, v]) => v !== undefined).map(
        ([key, transformers]): [string, EffectHandler<any, any>[]] => {
          return [key, transformers!];
        },
      );

    for (const [type, handlers] of handlersEntries) {
      const currentHandlers = this.#handlers.get(type) ?? [];
      this.#handlers.set(type, currentHandlers.concat(handlers));
    }
  }

  addTransformers(transformers: EffectTransformers = []): void {
    if (transformers.length === 0) return;

    const transformersByType = Object.groupBy(transformers, ({ type }) => type);

    const transformersEntries = Object.entries(transformersByType)
      .filter(([_k, v]) => v !== undefined)
      .map(([key, transformers]): [string, EffectTransformer<unknown>[]] => {
        return [key, transformers!];
      });

    for (const [type, transformers] of transformersEntries) {
      const currentTransformers = this.#transformers.get(type) ?? [];
      this.#transformers.set(type, currentTransformers.concat(transformers));
    }
  }

  async handle<P extends any[], R>(type: string, ...payload: P): Promise<R> {
    if (this.#handlers.has(type)) {
      const handlers: EffectHandler<P, R>[] = this.#handlers.get(
        type,
      )!;

      for (const handler of handlers) {
        // @ts-ignore Promise.try is not yet typed in VSCode
        const result: R | Option<R> = await Promise.try(handler, ...payload);
        if (result instanceof Option) {
          if (result.isSome()) return result.value;
          else continue;
        }
        return result;
      }
    }

    if (this.#parent) {
      return this.#parent.handle(type, ...payload);
    }

    throw new Error(`Unhandled effect "${type}"`);
  }

  async transform<P>(type: string, payload: P): Promise<P> {
    if (this.#transformers.has(type)) {
      const transformers: EffectTransformer<P>[] = this.#transformers.get(
        type,
      )!;

      for (const transformer of transformers) {
        // @ts-ignore Promise.try is not yet typed in VSCode
        const result: P | Option<P> = await Promise.try(transformer, payload);
        if (result instanceof Option) {
          if (result.isSome()) {
            payload = result.value;
          }
        }
      }
      return payload;
    }

    if (this.#parent) {
      return this.#parent.transform(type, payload);
    }

    return payload;
  }
}

export const runWith = async <T>(
  fn: () => Promise<T>,
  options: {
    handlers?: EffectHandlers;
    transformers?: EffectTransformers;
  },
): Promise<T> => {
  const currentScope = effectScopes.at(-1);
  const scope = new EffectHandlerScope(currentScope);
  effectScopes.push(scope);

  scope.addHandlers(options.handlers);
  scope.addTransformers(options.transformers);

  try {
    return await fn();
  } finally {
    effectScopes.pop();
  }
};

export const addHandlers = (handlers: EffectHandlers): void => {
  const currentScope = effectScopes.at(-1);
  assertExists(
    currentScope,
    "'addHandlers' should run inside an EffectScope. Use 'runWith'",
  );
  currentScope.addHandlers(handlers);
};

export const addTransformers = (transformers: EffectTransformers): void => {
  const currentScope = effectScopes.at(-1);
  assertExists(
    currentScope,
    "'addTransformers' should run inside an EffectScope. Use 'runWith'",
  );
  currentScope.addTransformers(transformers);
};
