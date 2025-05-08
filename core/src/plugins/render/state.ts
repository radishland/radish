import { assertEquals } from "@std/assert";
import type { HandlerRegistry } from "@radish/runtime";
import type { ElementManifest } from "../../effects/render.ts";

const handlerRegistryStack: { tagName: string; instance: HandlerRegistry }[] =
  [];

export const contextLookup = (identifier: string) => {
  for (let i = handlerRegistryStack.length - 1; i >= 0; i--) {
    const instance = handlerRegistryStack[i]?.instance;
    if (instance && Object.hasOwn(instance, identifier)) {
      return instance.lookup(identifier)?.valueOf(); // runs the getter and returns the property or method value
    }
  }
};

export const mountHandlerRegistry = async (
  tagName: string,
  element: ElementManifest | undefined,
): Promise<Disposable> => {
  if (element?.classLoader) {
    const ElementClass = await element.classLoader();
    const instance = new ElementClass();

    handlerRegistryStack.push({ tagName, instance });
  }

  return {
    [Symbol.dispose]() {
      if (element?.classLoader) {
        handlerRegistryStack.pop();
      }
    },
  };
};

export const assertEmptyHandlerRegistryStack = () => {
  assertEquals(handlerRegistryStack.length, 0);
};
