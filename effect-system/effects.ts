import { assertExists } from "@std/assert";
import { type BaseHandler, Continue, Handler } from "./handlers.ts";

// Effects and handlers are parametrized by the 'type' property

interface HandlerWithType<P extends any[], R> extends Handler<P, R> {
  readonly type: string;
}

/**
 * An array of handlers
 */
export type Handlers = (HandlerWithType<any, any>)[];

export interface EffectWithType<P extends any[], R> {
  (...payload: P): Effect<R>;
  readonly type: string;
}

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

// Effect creator
export function createEffect<Op extends (...payload: any[]) => any>(
  type: string,
): EffectWithType<Parameters<Op>, ReturnType<Op>> {
  const effect = (...payload: Parameters<Op>): Effect<ReturnType<Op>> => {
    return new Effect(() => perform(type, ...payload));
  };

  Object.defineProperty(effect, "type", { value: type, writable: false });

  return effect as EffectWithType<Parameters<Op>, ReturnType<Op>>;
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

/**
 * Creates a handler for a given effect
 */
export const handlerFor = <P extends any[], R>(
  effect: EffectWithType<P, R>,
  handler: NoInfer<BaseHandler<P, R>>,
): HandlerWithType<P, R> => {
  const { type } = effect;
  const lifted = new Handler(handler);
  Object.defineProperty(lifted, "type", { value: type, writable: false });
  return lifted as HandlerWithType<P, R>;
};

/**
 * Handlers are dependent on scope, yielding a stratified structure
 *
 * Note: more precisely, handlers override each other from scope to scope giving a pre-sheaf
 * over the scopes pre-order category. More succinctly, we've got a fibration over scopes
 */
class EffectHandlerScope {
  #parent: EffectHandlerScope | undefined;
  #handlers = new Map<string, Handler<any, any>[]>();

  constructor(parent?: EffectHandlerScope) {
    this.#parent = parent;
  }

  addHandlers(handlers: Handlers = []) {
    if (handlers.length === 0) return;

    const handlersByType = Object.groupBy(handlers, ({ type }) => type);
    const handlersEntries = Object.entries(handlersByType)
      .filter(([_k, v]) => v !== undefined)
      .map(([key, handler]): [string, Handler<any, any>[]] => {
        return [key, handler!];
      });

    for (const [type, handlers] of handlersEntries) {
      const currentHandlers = this.#handlers.get(type) ?? [];
      this.#handlers.set(
        type,
        currentHandlers.concat(handlers),
      );
    }
  }

  async handle<P extends any[], R>(type: string, ...payload: P): Promise<R> {
    if (this.#handlers.has(type)) {
      const handlers: Handler<P, R>[] = this.#handlers.get(type)!;
      const result: R | Continue<P> = await Handler.fold(handlers).run(
        ...payload,
      );

      if (!(result instanceof Continue)) {
        return result;
      }

      if (this.#parent) {
        return this.#parent.handle(type, ...result.getPayload());
      }

      throw new Error(
        `The handling of the "${type}" returned a Continue. Use Done to terminate the handlers sequence`,
      );
    }

    if (this.#parent) {
      return this.#parent.handle(type, ...payload);
    }

    throw new Error(`Unhandled effect "${type}"`);
  }
}

/**
 * Attaches a list of handlers to the current scope before running the provided function
 */
export const runWith = async <T>(
  fn: () => Promise<T>,
  handlers: Handlers = [],
): Promise<T> => {
  const currentScope = effectScopes.at(-1);
  const scope = new EffectHandlerScope(currentScope);
  effectScopes.push(scope);

  scope.addHandlers(handlers);

  try {
    return await fn();
  } finally {
    effectScopes.pop();
  }
};

/**
 * Adds a list of handlers to the current scope
 */
export const addHandlers = (handlers: Handlers): void => {
  let currentScope = effectScopes.at(-1);
  if (!currentScope) {
    currentScope = new EffectHandlerScope();
    effectScopes.push(currentScope);
  }

  currentScope.addHandlers(handlers);
};
