import { assertExists } from "@std/assert";
import type { MaybePromise } from "../types.d.ts";
import { Option } from "../monads.ts";

type EffectHandler<P extends any[], R> = (
  ...payload: P
) => MaybePromise<R | Option<R>>;

type HandlerWithType<P extends any[], R> = {
  type: string;
  handler: EffectHandler<P, R>;
};

type EffectHandlers = HandlerWithType<any, any>[];

const effectScopes: EffectHandlerScope[] = [];

// Effect monad
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

  // Monadic operations
  /**
   * Pure/of
   */
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

// Effect creator
export function createEffect<Op extends (...payload: any[]) => any>(
  type: string,
): (...payload: Parameters<Op>) => Effect<ReturnType<Op>> {
  const effectRunner = (...payload: Parameters<Op>): Effect<ReturnType<Op>> => {
    return new Effect(() => perform(type, ...payload));
  };

  effectRunner[Symbol.toStringTag] = type;
  return effectRunner;
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

export const handlerFor = <P extends any[], R>(
  effectRunner: (...payload: P) => Effect<R>,
  handler: NoInfer<EffectHandler<P, R>>,
): HandlerWithType<P, R> => {
  const type: string = Object.getOwnPropertyDescriptor(
    effectRunner,
    Symbol.toStringTag,
  )?.value;
  return { type, handler };
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

  constructor(parent?: EffectHandlerScope) {
    this.#parent = parent;
  }

  register(handlers: EffectHandlers) {
    const handlersByType = Object.groupBy(handlers, ({ type }) => type);

    const handlersEntries = Object.entries(handlersByType)
      .filter(([_k, v]) => v !== undefined)
      .map(([key, handlers]): [string, EffectHandler<any, unknown>[]] => {
        return [key, handlers!.map(({ handler }) => handler)];
      });

    this.#handlers = new Map(handlersEntries);
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
}

export const runWith = async <T>(
  fn: () => Promise<T>,
  options: {
    handlers?: EffectHandlers;
  },
): Promise<T> => {
  const currentScope = effectScopes.at(-1);
  const scope = new EffectHandlerScope(currentScope);
  effectScopes.push(scope);
  scope.register(options.handlers ?? []);

  try {
    return await fn();
  } finally {
    effectScopes.pop();
  }
};
