import { isElementNode, Kind, textNode } from "@radish/htmlcrunch";
import { assert } from "@std/assert";
import { Handler } from "../../../../exports/effects.ts";
import { handlerFor } from "../../../effects/effects.ts";
import { render } from "../../../effects/render.ts";
import { contextLookup } from "../state.ts";

export const handleHtmlDirective = handlerFor(
  render.directive,
  (node, attrKey, attrValue) => {
    if (attrKey === "html") {
      const identifier = attrValue || attrKey;
      const value = contextLookup(identifier);

      assert(isElementNode(node));
      assert(node.kind !== Kind.VOID, "Void elements can't have innerHTML");

      if (value !== null && value !== undefined) {
        node.children = [textNode(`${value}`)];
      }
    }

    return Handler.continue(node, attrKey, attrValue);
  },
);
