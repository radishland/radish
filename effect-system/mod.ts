/**
 * [Radish](https://github.com/radishland/radish) effect-system unlocks **modularity**, **testability**, **simplicity**, **customizability**.
 *
 * - **Modularity**: Decouple effects descriptions from their interpretations
 * - **Testability**: Swap handlers in a test environment to easily mock deep side-effects without modifying your API for testing purposes
 * - **Simplicity**: Think in terms of operations. And avoiding the need to pass context objects or callbacks solely for testing makes code simpler and more focused, with thinner, single responsibility APIs
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
 * ## Out-of-the-box Plugin API
 *
 * As a bonus, you get a {@linkcode Plugin} API out-of-the-box: define your own effects and handlers, and allow consumers to extend and override them with their own handlers to suit their needs. This provides flexibility and a high level of control to your users.
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
 * @example Create a plugin
 *
 * Export your handlers as a {@linkcode Plugin} for the reusability of related functionality. The {@linkcode HandlerScope} constructor also accepts plugins as arguments.
 *
 * ```ts
 * const pluginIO = {
 *   name: "plugin-io",
 *   handlers: [handleIORead, handleIOTransform, handleIOWrite]
 * };
 *
 * // Usage
 * {
 *  using _ = new HandlerScope(pluginIO);
 *
 *  const content = await io.read("/path/to/input");
 *  const transformed = await io.transform(content);
 *  await io.write("/path/to/output", transformed);
 *  // logs "writing to /path/to/output: MY CONTENT"
 * }
 *
 * ```
 *
 * @module
 */

import type { Handlers } from "./handlers.ts";

export { createEffect, type Effect, handlerFor } from "./effects.ts";
export {
  addHandlers,
  Handler,
  type Handlers,
  HandlerScope,
  Snapshot,
} from "./handlers.ts";
export { createState, type StateOps } from "./state.ts";

/**
 * A plugin is a named list of handlers
 */
export interface Plugin {
  /**
   * The name of the plugin
   */
  name: string;
  /**
   * The list of handlers related to a service or effect
   */
  handlers: Handlers;
}

/**
 * The polymorphic identity
 *
 * Useful for implementing trivial handlers for transform effects
 *
 * @example
 *
 * ```ts
 * const trivialHandler = handlerFor(transformEffect, id);
 * ```
 */
export const id = <T>(value: T): T => value;
