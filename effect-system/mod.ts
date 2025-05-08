export * from "./handlers.ts";
export * from "./effects.ts";

/**
 * The polymorphic identity
 */
export const id = <T>(value: T): T => value;
