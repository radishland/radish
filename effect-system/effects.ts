import { assertExists } from "@std/assert";
import {
  type BaseHandler,
  Continue,
  Handler,
  type Handlers,
} from "./handlers.ts";

/**
 * `EffectWithId` describes an effect runner and its corresponding id, as returned by {@linkcode createEffect}
 */
export interface EffectWithId<P extends any[], R> {
  /**
   * The effect runner
   */
  (...payload: P): Effect<R>;
  /**
   * The unique `id` the the effect
   */
  readonly id: string;
}

const effectScopes: EffectHandlerScope[] = [];

/**
 * @internal
 */
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

/**
 * Define a new effect with `createEffect` by specifying the operation signature and the name of the effect.
 *
 * The type parameter of `createEffect` specifies the operation signature. This provides type-safety when implementing handlers with {@linkcode handlerFor} or performing the effect.
 *
 * @example Defining effects
 *
 * Effects can be defined without providing an implementation yet.
 *
 * ```ts
 * import { createEffect } from "@radish/effect-system";
 *
 * interface IO {
 *  transform: (content: string) => string;
 * }
 *
 * interface Render {
 *  transform: (node: Node) => Node;
 * }
 *
 * // Provide a globally unique key when creating an effect.
 * // Here `io/transform` and `render/transform` do not clash
 *
 * const io = {
 *  transform: createEffect<IO['transform']>('io/transform'),
 * }
 *
 * const render = {
 *  transform: createEffect<Render['transform']>('render/transform'),
 * }
 * ```
 *
 * @param {string} id The unique id of the effect. Must be **unique** among effects as indicates which handlers run when an effect is performed.
 *
 * @typeParam Op The operation signature. This is the effect-free contract for handlers implementing this effect with {@linkcode handlerFor}. In particular a handler can perform any other effect, be synchronous, asynchronous, partial or total.
 *
 * @see {@linkcode handlerFor}
 */
export function createEffect<Op extends (...payload: any[]) => any>(
  id: string,
): EffectWithId<Parameters<Op>, ReturnType<Op>> {
  const effect = (...payload: Parameters<Op>): Effect<ReturnType<Op>> => {
    return new Effect(() => perform(id, ...payload));
  };

  Object.defineProperty(effect, "id", { value: id, writable: false });

  return effect as EffectWithId<Parameters<Op>, ReturnType<Op>>;
}

const perform = <P extends any[], R>(id: string, ...payload: P): Promise<R> => {
  const currentScope = effectScopes.at(-1);
  assertExists(
    currentScope,
    `Effect "${id}" should run inside a handler scope. Use runWith`,
  );
  return currentScope.handle<P, R>(id, ...payload);
};

/**
 * Use `handlerFor` to implement a handler for an effect.
 *
 * Handlers for the same effect can be:
 * - **Synchronous** or **asynchronous**
 * - **Total** (handle all inputs) or **partial** (handle selectively)
 *
 * and they can be freely mixed and composed as needed.
 *
 * @example IO effect
 *
 * The examples in this section assume the following `io` effect is defined
 *
 * ```ts
 * import { createEffect } from "@radish/effect-system";
 *
 * interface IO {
 *   read: (path: string) => string;
 *   write: (path: string; content: string) => void;
 * }
 *
 * const io = {
 *   read: createEffect<IO['read']>('io/read'),
 *   write: createEffect<IO['write']>('io/write')
 * }
 * ```
 *
 * @example Synchronous and asynchronous handlers
 *
 * Different handlers for the same effect can be synchronous or asynchronous.
 *
 * The operation signature (*e.g.* `A -> B`) is the minimal, effect-free contract. Handlers are free to perform their own effects, and asynchrony being an effect, async handlers (*e.g.* `A -> Promise<B>`) are allowed.
 *
 * ```ts
 * import { handlerFor } from "@radish/effect-system";
 *
 * // This handler is asynchronous
 * const IOReadHandler = handlerFor(io.read, async (path: string) => {
 *   console.log(`reading ${path}`);
 *   return await Deno.readTextFile(path);
 * })
 *
 * // This handler is synchronous
 * const IOWriteHandler = handlerFor(io.write, (path: string, content: string) => {
 *   console.log(`writing ${path}`);
 *   return Deno.writeTextFileSync(content);
 * })
 *
 * // In a testing environment we could swap our `IOReadHandler` with `IOReadHandlerMock`
 * const files = new Map([['notes.txt', 'TODO']]);
 *
 * const IOReadHandlerMock = handlerFor(io.read, (path: string) => {
 *   return files.get(path) ?? ''
 * })
 * ```
 *
 * @example Partial & Total Handlers
 *
 * Handlers don't have to be total functions. They can be **partial**, handling only specific cases, and delegating the rest to other handlers.
 *
 * To delegate the handling we use {@linkcode Handler.continue Handler.continue(...)}  as shown below. You can modify arguments before forwarding them.
 *
 * This forwarding mechanism enables several powerful patterns:
 *
 * - **Delegation**: Focus on handling a specific case
 * - **Decoration**: Wrap or augment another handler
 * - **Observation**: React to effects and do something orthogonal
 *
 * Handlers can also perform other effects while handling their own operation
 *
 * ```ts
 * import { Handler } from "@radish/effect-system";
 *
 * // This handler relies on delegation
 * const IOReadTXTOnly = handlerFor(io.read, (path: string) => {
 *   if(path.endsWith(".txt")) {
 *     return "I can only handle .txt files"
 *   }
 *   return Handler.continue(path) // delegates to other handlers
 * })
 *
 * // A decorator handler that modifies content before writing
 * const IODecorateTXT = handlerFor(io.write, (path: string, content: string)=>{
 *   if(path.endsWith(".txt")) {
 *     content = "/ Copyright notice /" + content
 *   }
 *   return Handler.continue(path, content)
 * })
 *
 * let count = 0;
 * // A listener that performs orthogonal logic
 * const IOCountTXTReads = handlerFor(io.read, (path: string)=>{
 *   if(path.endsWith(".txt")) {
 *     count += 1
 *   }
 *   return Handler.continue(path)
 * })
 *
 * ```
 *
 * @param effect The effect we're implementing a handler for
 * @param handler The handler implementation
 */
export const handlerFor = <P extends any[], R>(
  effect: EffectWithId<P, R>,
  handler: NoInfer<BaseHandler<P, R>>,
): Handler<P, R> => {
  const { id } = effect;
  return new Handler(id, handler);
};

/**
 * Handlers are dependent on scope, yielding a stratified structure
 */
class EffectHandlerScope {
  #parent: EffectHandlerScope | undefined;
  #handlers = new Map<string, Handler<any, any>>();

  constructor(parent?: EffectHandlerScope) {
    this.#parent = parent;
  }

  addHandlers(handlers: Handlers) {
    const handlersById = Object.groupBy(handlers, ({ id }) => id);
    const handlersEntries = Object.entries(handlersById)
      .filter(([_k, v]) => v !== undefined)
      .map(([key, _handlers]): [string, Handler<any, any>[]] => {
        return [key, _handlers!];
      });

    for (let [id, _handlers] of handlersEntries) {
      const currentHandler = this.#handlers.get(id);
      _handlers = currentHandler ? [currentHandler, ..._handlers] : _handlers;

      const newHandler = Handler.fold(_handlers);
      this.#handlers.set(id, newHandler);
    }
  }

  async handle<P extends any[], R>(id: string, ...payload: P): Promise<R> {
    if (this.#handlers.has(id)) {
      const handler: Handler<P, R> = this.#handlers.get(id)!;
      const result: R | Continue<P> = await handler.run(...payload);

      if (!(result instanceof Continue)) {
        return result;
      }

      if (this.#parent) {
        return this.#parent.handle(id, ...result.getPayload());
      }

      throw new Error(
        `Handling the "${id}" effect returned a \`Continue\`. Use \`return\` to terminate the handlers sequence`,
      );
    }

    if (this.#parent) {
      return this.#parent.handle(id, ...payload);
    }

    throw new UnhandledEffectError(id);
  }
}

/**
 * Attaches a list of handlers to the current scope before running the provided callback
 *
 * @example Ordering handlers
 *
 * The ordering of the handlers matters when they rely on delegation via {@linkcode Handler.continue}
 *
 * ```ts
 * import { runWith } from 'radish/effects';
 *
 * runWith(async () => {
 *   const txtFile = await io.read("hello.txt"); // "I can only handle .txt files"
 *   const jsonFile = await io.read("hello.json"); // ...
 * }, [handleTXTOnly, handleReadOp])
 * ```
 *
 * @param fn The effectful program to run
 * @param handlers A list of handlers implementing **all** the effects performed by the program
 *
 * @throws {UnhandledEffectError} Throws an {@linkcode UnhandledEffectError} error if an effect is performed with no handler in scope
 *
 * @see {@linkcode addHandlers}
 */
export const runWith = async <T>(
  fn: () => Promise<T>,
  handlers: Handlers,
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
 *
 * @param handlers The list of handlers to attach to the current scope
 */
export const addHandlers = (handlers: Handlers): void => {
  let currentScope = effectScopes.at(-1);
  if (!currentScope) {
    currentScope = new EffectHandlerScope();
    effectScopes.push(currentScope);
  }

  currentScope.addHandlers(handlers);
};

/**
 * Error thrown when an effect is performed but not handled
 *
 * @internal
 */
export class UnhandledEffectError extends Error {
  id: string;

  constructor(id: string, ...params: ConstructorParameters<typeof Error>) {
    super(...params);
    this.id = id;
    this.name = this.constructor.name;
    this.message = `Unhandled effect "${id}"`;

    Error.captureStackTrace(this, UnhandledEffectError);
  }
}
