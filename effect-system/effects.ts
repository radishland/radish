import { type BaseHandler, Handler, perform } from "./handlers.ts";

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
