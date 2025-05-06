import type { MNode } from "@radish/htmlcrunch";
import { assertEquals, assertExists } from "@std/assert";
import type { HandlerRegistry } from "../../../../runtime/src/handler-registry.ts";
import { handlerFor } from "../../effects/effects.ts";
import { type ElementManifest, render } from "../../effects/render.ts";

let currentNode: MNode | undefined;

export const handleRenderState = [
  handlerFor(render.setCurrentNode, (node) => {
    currentNode = node;
  }),

  handlerFor(render.getCurrentNode, () => {
    assertExists(currentNode);
    return currentNode;
  }),
];

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
) => {
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
  } satisfies Disposable;
};

export const assertEmptyHandlerRegistryStack = () => {
  assertEquals(handlerRegistryStack.length, 0);
};
