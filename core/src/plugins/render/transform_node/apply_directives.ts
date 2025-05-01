import { isElementNode } from "../../../../../htmlcrunch/parser.ts";
import { handlerFor } from "../../../effects/effects.ts";
import { Handler } from "../../../effects/handlers.ts";
import { render } from "../../../effects/render.ts";

export const applyDirectives = handlerFor(
  render.transformNode,
  async (node) => {
    if (!isElementNode(node)) return Handler.continue(node);

    for (const [attrKey, attrValue] of node.attributes) {
      await render.directive(attrKey, attrValue);
    }

    return Handler.continue(node);
  },
);
