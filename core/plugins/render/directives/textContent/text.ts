import { render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { isElementNode, Kind, textNode } from "@radish/htmlcrunch";
import { assert } from "@std/assert";
import { contextLookup } from "../../state.ts";

export const handleTextDirective = handlerFor(
  render.directive,
  (node, attrKey: string, attrValue: string) => {
    if (attrKey === "textContent") {
      const identifier = attrValue || attrKey;
      const value = contextLookup(identifier);

      assert(isElementNode(node));
      assert(node.kind !== Kind.VOID, "Void elements can't have textContent");

      if (value !== null && value !== undefined) {
        node.children = [textNode(`${value}`)];
      }
    }

    return Handler.continue(node, attrKey, attrValue);
  },
);
