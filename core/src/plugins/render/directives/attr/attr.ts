import { isElementNode } from "@radish/htmlcrunch";
import { assert, assertExists } from "@std/assert";
import { Handler } from "../../../../../exports/effects.ts";
import { handlerFor } from "../../../../effects/effects.ts";
import { render } from "../../../../effects/render.ts";
import { setAttribute } from "../../common.ts";
import { contextLookup } from "../../state.ts";

export const handleAttrDirective = handlerFor(
  render.directive,
  (node, attrKey, attrValue) => {
    if (attrKey.startsWith("attr:") || attrKey.startsWith("attr|server:")) {
      const [_, attribute] = attrKey.split(":");
      const identifier = attrValue || attribute;

      assertExists(attribute, "Missing attr: attribute");
      assertExists(identifier, "Missing attr: identifier");

      const value = contextLookup(identifier);

      if (value !== null && value !== undefined) {
        assert(isElementNode(node));

        setAttribute(node.attributes, attribute, value);
      }
    }

    return Handler.continue(node, attrKey, attrValue);
  },
);
