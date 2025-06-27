import { render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { isElementNode } from "@radish/htmlcrunch";
import { assert, assertExists } from "@std/assert";
import { contextLookup } from "../../../utils/contextLookup.ts";

export const onRenderTransformBoolDirective = handlerFor(
  render.transformNode,
  (path, node) => {
    if (!isElementNode(node)) return Handler.continue(path, node);

    const boolDirectives = node.attributes.filter(([key, _value]) =>
      key.startsWith("bool:")
    );

    for (const [attrKey, attrValue] of boolDirectives) {
      const [_, attribute] = attrKey.split("bool:");
      const identifier = attrValue || attribute;

      assertExists(attribute, "Missing bool: attribute");
      assertExists(identifier, "Missing bool: identifier");

      const value = contextLookup(node, identifier);

      assert(isElementNode(node));
      value && node.attributes.push([attribute, ""]);
    }

    return Handler.continue(path, node);
  },
);
