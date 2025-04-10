import { assertExists } from "@std/assert";

type EffectHandler<P, R> = (payload: P) => Promise<R>;
type EffectHandlers = Record<string, EffectHandler<any, any>>;

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
    return new Effect(() => this.perform().then(onfulfilled, onrejected));
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
export function createEffect<P, R>(type: string) {
  return (payload: P): Effect<R> => {
    return new Effect((): Promise<R> => {
      const currentScope = effectScopes.at(-1);
      assertExists(
        currentScope,
        `Effect "${type}" should run inside a handler scope. Use runWith`,
      );
      return currentScope.handle(type, payload);
    });
  };
}

interface IO {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, data: string) => Promise<void>;
}

const io = {
  readFile: createEffect<string, string>("readFile"),
};

io.readFile("path");

const readFile = createEffect<string, string>("file/read");
const content = await readFile("path/to/file");

/**
 * Handlers are dependent on scope, yielding a stratified structure
 *
 * Note: more precisely, handlers override each other from scope to scope giving a pre-sheaf
 * over the scopes pre-order category. More succinctly, we've got a fibration over scopes
 */
class EffectHandlerScope {
  #parent: EffectHandlerScope | undefined;
  #handlers = new Map<string, EffectHandler<any, any>>();

  constructor(parent?: EffectHandlerScope) {
    this.#parent = parent;
  }

  register<P, R>(type: string, handler: EffectHandler<P, R>) {
    this.#handlers.set(type, handler);
  }

  handle<P, R>(type: string, payload: P): Promise<R> {
    if (this.#handlers.has(type)) {
      const handler = this.#handlers.get(type)!;
      return handler(payload);
    }

    if (this.#parent) {
      return this.#parent.handle(type, payload);
    }

    throw new Error(`Unhandled effect "${type}"`);
  }
}

export const runWith = async <T>(
  fn: () => Promise<T>,
  options?: {
    handlers?: EffectHandlers;
  },
): Promise<T> => {
  const currentScope = effectScopes.at(-1);
  const scope = new EffectHandlerScope(currentScope);
  effectScopes.push(scope);

  for (const [type, handler] of Object.entries(options?.handlers ?? {})) {
    scope.register(type, handler);
  }

  try {
    return await fn();
  } finally {
    effectScopes.pop();
  }
};
