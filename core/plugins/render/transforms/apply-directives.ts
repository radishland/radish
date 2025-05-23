import { isElementNode } from "@radish/htmlcrunch";
import { Handler, handlerFor } from "@radish/effect-system";
import { render } from "$effects/render.ts";

/**
 * Transforms a node by performing the `render/directive` effect on each of its attributes
 *
 * @performs
 * - `render/directive`
 */
export const handleRenderTransformApplyDirectives = handlerFor(
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
