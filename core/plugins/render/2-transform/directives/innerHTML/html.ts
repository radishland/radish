import { render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { isElementNode, Kind, textNode } from "@radish/htmlcrunch";
import { assert } from "@std/assert";
import { contextLookup } from "../../../utils/contextLookup.ts";

export const onRenderTransformHtmlDirective = handlerFor(
  render.transformNode,
  (path, node) => {
    if (!isElementNode(node)) return Handler.continue(path, node);

    const [innerHtmlDirective] = node.attributes.filter(([key, _value]) =>
      key === ("html")
    );

    if (innerHtmlDirective) {
      const identifier = innerHtmlDirective[1];
      const value = contextLookup(node, identifier);

      assert(isElementNode(node));
      assert(
        node.kind !== Kind.VOID,
        "Void elements can't have innerHTML",
      );

      if (value !== null && value !== undefined) {
        node.children = [textNode(`${value}`)];
      }
    }

    return Handler.continue(path, node);
  },
);
