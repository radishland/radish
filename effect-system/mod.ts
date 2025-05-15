/**
 * Structuring code with the Radish effect system unlocks testability, simplicity, modularity, extendability, customizability.
 *
 * - **Testability**: Swap handlers in a testing environment to easily mock a deep side-effect
 * - **Simplicity**: Avoid passing context or callbacks just for testability makes code simpler and more focused (single responsibility) with a thinner API.
 * - **Modularity**: Thinner APIs implies more reuseable and composable code
 * - **Extendability**: Define your own effects and handlers.
 * - **Customizability**: Consumers of your library/framework can extend & override your effects, giving a high level of control and customizability with a plugin API.
 *
 * Use {@linkcode createEffect} to define an effect, and {@linkcode handlerFor} to implement a handler.
 *
 * To create a new scope with handlers to run effects in {@linkcode HandlerScope}.
 *
 * Handlers can also be added dynamically to a running programming with {@linkcode addHandlers}
 *
 * @example Defining effects
 *
 * ```ts
 * import { createEffect } from "@radish/effect-system";
 *
 * const io = {
 *   transform: createEffect<(content: string)=> string>('io/transform'),
 * }
 * ```
 *
 * @example Using effects
 *
 * When an effect is defined, we can use it in code type-safely without providing an implementation yet. This cleanly separates definition from implementation.
 *
 * To perform an effect operation we _await_ it. This allows the sequencing of effects in direct style.
 *
 * At runtime, performing an effect with no handler in scope will throw an "Unhandled effect" error.
 *
 * ```ts
 * // await to perform an effect
 * const transformed: string = await io.transform("some content");
 * ```
 *
 * @example Handling effects
 *
 * {@linkcode handlerFor} creates a new handler for an effect
 *
 * ```ts
 * import { handlerFor } from "@radish/effect-system";
 *
 * const handleIOTransform = handlerFor(io.transform, (content: string) => {
 *   return content;
 * });
 * ```
 *
 * @example Running code with effects and handlers
 *
 * {@linkcode HandlerScope} creates a new scope where handlers can handle effects
 *
 * ```ts
 * {
 *  using _ = new HandlerScope(handleIOTransform);
 *
 *  const transformed = await io.transform("some content");
 *  console.log(transformed);
 * }
 * ```
 *
 * @module
 */

export { createEffect, type EffectWithId, handlerFor } from "./effects.ts";
export {
  addHandlers,
  type BaseHandler,
  Handler,
  type Handlers,
  HandlerScope,
  Snapshot,
} from "./handlers.ts";

/**
 * The polymorphic identity
 *
 * Useful for implementing trivial handlers for transform effects
 *
 * @example
 *
 * ```ts
 * const trivialHandler = handlerFor(io.transformFile, id);
 * ```
 */
export const id = <T>(value: T): T => value;
