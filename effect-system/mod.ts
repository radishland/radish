/**
 * Structuring code with an effect system unlocks **testability**, **simplicity**, **modularity**, **customizability**.
 *
 * - **Testability**: Swap handlers in a test environment to easily mock deep side-effects without modifying your API for testing purposes
 * - **Simplicity**: Avoiding the need to pass context objects or callbacks solely for testing makes code simpler and more focused, with thinner, single responsibility APIs
 * - **Modularity**: Thinner APIs with focused responsibilities make code more reuseable and composable
 * - **Customizability**: Consumers of your library or framework can override effect handlers to suit their needs
 *
 * ## Powerful Handler Patterns
 *
 * Handlers can be:
 * - synchronous or asynchronous
 * - partial or total
 *
 * This flexibility enables powerful patterns like handler delegation, dynamic decoration and effect observation.
 *
 * See {@linkcode handlerFor}
 *
 * ## AsyncState
 *
 * In stateful async workflows, you can create AsyncState and take snapshots of {@linkcode HandlerScope HandlerScopes}, including their handlers and store, and later restore these scopes, states and handlers across async boundaries, without race conditions or context loss.
 *
 * See {@linkcode Snapshot} and {@linkcode createState}
 *
 * ## Zero-effort Plugin API
 *
 * As a bonus, you get a plugin API out of the box: define your own effects and handlers, and allow consumers to extend and override them with their own handlers to suit their needs. This provides flexibility and a high level of control to your users
 *
 * @example Create a new effect
 *
 * Use {@linkcode createEffect} to create a new effect
 *
 * ```ts
 * import { createEffect } from "@radish/effect-system";
 *
 * const io = {
 *   read: createEffect<(path: string) => string>('io/read'),
 *   transform: createEffect<(content: string)=> string>('io/transform'),
 *   write: createEffect<(path: string, data: string)=> void>('io/write'),
 * }
 * ```
 *
 * @example Perform an effect
 *
 * We can already use the above effect without providing an implementation yet. This separates definition from implementation.
 *
 * To perform an effect operation we _await_ it. This allows the sequencing of effects in direct style.
 *
 * ```ts
 * // a sequence of effects
 * const content = await io.read("/path/to/input");
 * const transformed = await io.transform(content);
 * await io.write("/path/to/output", transformed);
 * ```
 *
 * @example Create an effect handler
 *
 * Use {@linkcode handlerFor} to create a handler for a given effect
 *
 * ```ts
 * import { handlerFor } from "@radish/effect-system";
 *
 * const handleIORead = handlerFor(io.read, (path: string) => {
 *   return "my content";
 * });
 *
 * const handleIOTransform = handlerFor(io.transform, (content: string) => {
 *   return content.toUpperCase();
 * });
 *
 * const handleIOWrite = handlerFor(io.transform, (path: string, data: string) => {
 *   console.log(`writing to ${path}: ${data}`);
 * });
 * ```
 *
 * @example Perform effects with handlers in scope
 *
 * Use {@linkcode HandlerScope} to create a new scope with handlers to run effects in.
 *
 * ```ts
 * {
 *  using _ = new HandlerScope(handleIORead, handleIOTransform, handleIOWrite);
 *
 *  const content = await io.read("/path/to/input");
 *  const transformed = await io.transform(content);
 *  await io.write("/path/to/output", transformed);
 *  // logs "writing to /path/to/output: MY CONTENT"
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
