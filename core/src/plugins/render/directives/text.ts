import { isElementNode, Kind, textNode } from "@radish/htmlcrunch";
import { assert } from "@std/assert";
import { Handler } from "../../../../exports/effects.ts";
import { handlerFor } from "../../../effects/effects.ts";
import { render } from "../../../effects/render.ts";
import { contextLookup } from "../state.ts";

export const handleTextDirective = handlerFor(
  render.directive,
  async (attrKey: string, attrValue: string) => {
    if (attrKey === "text") {
      const identifier = attrValue || attrKey;
      const value = contextLookup(identifier);
      const node = await render.getCurrentNode();

      assert(isElementNode(node));
      assert(node.kind !== Kind.VOID, "Void elements can't have textContent");

      if (value !== null && value !== undefined) {
        node.children = [textNode(`${value}`)];
      }
    }

    return Handler.continue(attrKey, attrValue);
  },
);
