import { isElementNode } from "@radish/htmlcrunch";
import { handlerFor } from "../../../effects/effects.ts";
import { Handler } from "../../../effects/handlers.ts";
import { render } from "../../../effects/render.ts";

export const handleApplyDirectivesTransform = handlerFor(
  render.transformNode,
  async (node) => {
    if (!isElementNode(node)) return Handler.continue(node);

    const attributesCopy = [...node.attributes];
    for (const [attrKey, attrValue] of attributesCopy) {
      await render.directive(node, attrKey, attrValue);
    }

    return Handler.continue(node);
  },
);
