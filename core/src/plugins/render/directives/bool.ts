import { isElementNode } from "@radish/htmlcrunch";
import { assert, assertExists } from "@std/assert";
import { Handler, handlerFor } from "../../../../exports/effects.ts";
import { render } from "../../../effects/render.ts";
import { setAttribute } from "../common.ts";
import { contextLookup } from "../state.ts";

export const handleBoolDirective = handlerFor(
  render.directive,
  (node, attrKey, attrValue) => {
    if (attrKey.startsWith("bool:")) {
      const [_, attribute] = attrKey.split(":");
      const identifier = attrValue || attribute;

      assertExists(attribute, "Missing bool: attribute");
      assertExists(identifier, "Missing bool: identifier");

      const value = contextLookup(identifier);

      assert(isElementNode(node));
      setAttribute(node.attributes, attribute, value);
    }

    return Handler.continue(node, attrKey, attrValue);
  },
);
