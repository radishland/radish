import { IllFormedEffectError } from "./errors.ts";
import {
  type BaseHandler,
  Handler,
  type HandlerOptions,
  perform,
} from "./handlers.ts";

/**
 * The effect class
 *
 * You don't interact directly with this class, effects are created with {@linkcode createEffect}
 *
 * @see {@linkcode createEffect}
 *
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
 * interface FS {
 *  transform: (content: string) => string;
 * }
 *
 * interface Render {
 *  transform: (node: Node) => Node;
 * }
 *
 * // Provide a globally unique key when creating an effect.
 * // Here `fs/transform` and `render/transform` do not clash
 *
 * const fs = {
 *  transform: createEffect<FS['transform']>('fs/transform'),
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
): (...payload: Parameters<Op>) => Effect<ReturnType<Op>> {
  const effect = (...payload: Parameters<Op>): Effect<ReturnType<Op>> => {
    return new Effect(() => perform(id, ...payload));
  };

  Object.defineProperty(effect, "id", { value: id, writable: false });
  return effect;
}

/**
 * Use `handlerFor` to implement a handler for an effect.
 *
 * Handlers for the same effect can be:
 * - **Synchronous** or **asynchronous**
 * - **Total** (handles all inputs) or **partial** (handles selectively)
 *
 * and they can be freely mixed and composed as needed.
 *
 * @example FS effect
 *
 * The examples in this section assume the following `fs` effect is defined
 *
 * ```ts
 * import { createEffect } from "@radish/effect-system";
 *
 * interface FS {
 *   read: (path: string) => string;
 *   transform: (content: string) => string;
 *   write: (path: string, content: string) => void;
 * }
 *
 * const fs = {
 *   read: createEffect<FS['read']>('fs/read'),
 *   transform: createEffect<FS['transform']>('fs/read'),
 *   write: createEffect<FS['write']>('fs/write')
 * }
 * ```
 *
 * @example Recursive handlers
 *
 * Handlers can perform effects, even recursively performing their own effect
 *
 * ```ts
 * const handleNumberTransform = handlerFor(
 * number.transform,
 * async (digits) => {
 *   if (digits.length === 0) return digits;
 *
 *   const firstDigit = digits.charAt(0);
 *   let count = 0;
 *
 *   while (digits.charAt(count) === firstDigit) {
 *     count++;
 *   }
 *
 *   const prefix = `${count}${firstDigit}`;
 *   const remaining = digits.slice(count);
 *
 *   if (remaining.length === 0) {
 *     return prefix;
 *   }
 *
 *   return prefix + await number.transform(remaining);
 * });
 *
 * using _ = new HandlerScope(handleNumberTransform);
 *
 * const transformed = await number.transform("2113");
 * assertEquals(transformed, "122113");
 * ```
 *
 * @example Suspended handlers
 *
 * Recursion is not always wanted: in the case of postprocessing hooks it would result in infinite loops.
 *
 * The `reentrant` option allows to opt-out of recursion by declaring a handler as non reentrant. This will "suspend" the handler until the effect is fully handled, preventing infinite loops.
 *
 * ```ts
 * // this handler needs to perform its own effect non-recursively to do some postprocessing
 * const handlerTransformA = handlerFor(fs.transform, async (path, content) => {
 *   const transformed = await fs.transform(path, content);
 *   return "a" + transformed + "a";
 * }, { reentrant: false });
 *
 * const handleTransformB = handlerFor(fs.transform, async (path, content) => {
 *   const transformed = await fs.transform(path, content);
 *   return "b" + transformed + "b";
 * }, { reentrant: false });
 *
 * const handleTransformUpper = handlerFor(fs.transform, (_path, content) => {
 *   return content.toUpperCase();
 * })
 *
 * using _ = new HandlerScope(
 *   handlerTransformA,
 *   handlerTransformB,
 *   handleTransformUpper,
 * );
 *
 * const transformed = await fs.transform("/path", "content");
 * assertEquals(transformed, "abCONTENTba");
 * ```
 *
 * @example Synchronous and asynchronous handlers
 *
 * Different handlers for the same effect can be synchronous or asynchronous.
 *
 * The operation signature passed as the {@linkcode createEffect} type parameter (*e.g.* `A -> B`) is the minimal, effect-free contract. Handlers are free to perform their own effects, and asynchrony is an effect, so in particular async handlers (*e.g.* `A -> Promise<B>`) are allowed.
 *
 * ```ts
 * import { handlerFor } from "@radish/effect-system";
 *
 * // This handler is asynchronous
 * const FSReadHandler = handlerFor(fs.read, async (path: string) => {
 *   console.log(`reading ${path}`);
 *   return await Deno.readTextFile(path);
 * })
 *
 * // This handler is synchronous
 * const FSWriteHandler = handlerFor(fs.write, (path: string, content: string) => {
 *   console.log(`writing ${path}`);
 *   return Deno.writeTextFileSync(content);
 * })
 *
 * // In a testing environment we could swap our `FSReadHandler` with `FSReadHandlerMock`
 * const files = new Map([['notes.txt', 'TODO']]);
 *
 * const FSReadHandlerMock = handlerFor(fs.read, (path: string) => {
 *   return files.get(path) ?? ''
 * })
 * ```
 *
 * @example Partial & Total Handlers
 *
 * Handlers don't have to be total functions. They can be **partial**, handling only specific cases, and delegating the rest to other handlers.
 *
 * Use {@linkcode Handler.continue Handler.continue(...args)} to delegate handling. You can modify arguments before forwarding them.
 *
 * This forwarding mechanism enables several powerful patterns:
 *
 * - **Delegation**: Focus on handling a specific case
 * - **Decoration**: Wrap or augment others handlers dynamically
 * - **Observation**: React to effects and do something orthogonal
 *
 * Handlers can also perform other effects while handling their own operation
 *
 * ```ts
 * import { Handler } from "@radish/effect-system";
 *
 * // This handler relies on delegation
 * const FSReadTXTOnly = handlerFor(fs.read, (path: string) => {
 *   if(path.endsWith(".txt")) {
 *     return "I can only handle .txt files"
 *   }
 *   return Handler.continue(path) // delegates to other handlers
 * })
 *
 * // A decorator handler that modifies content before writing
 * const FSDecorateTXT = handlerFor(fs.write, (path: string, content: string)=>{
 *   if(path.endsWith(".txt")) {
 *     content = "/ Copyright notice /" + content
 *   }
 *   return Handler.continue(path, content)
 * })
 *
 * let count = 0;
 * // A listener that performs orthogonal logic
 * const FSCountTXTReads = handlerFor(fs.read, (path: string) => {
 *   if(path.endsWith(".txt")) {
 *     count += 1;
 *   }
 *   return Handler.continue(path);
 * })
 *
 * ```
 *
 * @example Handler cleanup with `Symbol.dispose` and `Symbol.asyncDispose`
 *
 * Handlers can receive a `Symbol.dispose` or `Symbol.asyncDispose` to attach cleanup logic to the {@linkcode HandlerScope} using the handler.
 *
 * ```ts
 * let count = 0;
 *
 * const handleFSRead = handlerFor(fs.read, (path: string) => {
 *   if(path.endsWith(".txt")) {
 *     count += 1;
 *   }
 *   return Handler.continue(path);
 * });
 * handleFSRead[Symbol.dispose] = () => {
 *   count = 0;
 * }
 * ```
 *
 * @param effect The effect we're implementing a handler for
 * @param handler The handler implementation
 * @param options The options for the handler
 *
 * @see {@linkcode Handler.continue}
 */
export const handlerFor = <P extends any[], R>(
  effect: (...params: P) => Effect<R>,
  handler: NoInfer<BaseHandler<P, R>>,
  options?: HandlerOptions,
): Handler<P, R> => {
  if (!Object.hasOwn(effect, "id")) throw new IllFormedEffectError();

  // @ts-ignore id is there
  const { id } = effect;
  return new Handler(id, handler, options);
};
