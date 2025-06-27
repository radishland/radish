import { render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { isElementNode } from "@radish/htmlcrunch";
import { assert, assertExists } from "@std/assert";
import { contextLookup } from "../../../utils/contextLookup.ts";
import { setAttribute } from "../../../utils/setAttribute.ts";

export const onRenderTransformAttrDirective = handlerFor(
  render.transformNode,
  (path, node) => {
    if (!isElementNode(node)) return Handler.continue(path, node);

    const attrDirectives = node.attributes.filter(([key, _value]) =>
      key.startsWith("attr:")
    );

    for (const [key, attrValue] of attrDirectives) {
      const [_, attribute] = key.split("attr:");
      const identifier = attrValue || attribute;

      assertExists(attribute, "Missing attr: attribute");
      assertExists(identifier, "Missing attr: identifier");

      const value = contextLookup(node, identifier);

      if (value !== null && value !== undefined) {
        assert(isElementNode(node));
        setAttribute(node.attributes, attribute, value);
      }
    }

    return Handler.continue(path, node);
  },
);
