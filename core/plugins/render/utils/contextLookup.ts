import type { MElement } from "@radish/htmlcrunch";
import { unreachable } from "@std/assert";

export const HANDLER_INSTANCE = Symbol.for("handler registry instance");

export const contextLookup = (node: MElement, identifier: string) => {
  let current: MElement | undefined = node;

  while (current) {
    const instance = Object.getOwnPropertyDescriptor(current, HANDLER_INSTANCE)
      ?.value;
    if (instance && Object.hasOwn(instance, identifier)) {
      return instance.lookup(identifier)?.valueOf(); // runs the getter and returns the property or method value
    }
    current = current.parent;
  }

  unreachable(`. identifier ${identifier} not found`);
};
