import { isElementNode } from "@radish/htmlcrunch";
import { assert, assertExists } from "@std/assert";
import { Handler, handlerFor } from "../../../../exports/effects.ts";
import { render } from "../../../effects/render.ts";
import { setAttribute } from "../common.ts";
import { contextLookup } from "../state.ts";

export const handleBoolDirective = handlerFor(
  render.directive,
  async (attrKey: string, attrValue: string) => {
    if (attrKey.startsWith("bool:")) {
      const [_, attribute] = attrKey.split(":");
      const identifier = attrValue || attribute;

      assertExists(attribute, "Missing bool: attribute");
      assertExists(identifier, "Missing bool: identifier");

      const value = contextLookup(identifier);
      const node = await render.getCurrentNode();
      assert(isElementNode(node));

      setAttribute(node.attributes, attribute, value);
    }

    return Handler.continue(attrKey, attrValue);
  },
);
