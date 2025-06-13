import { render } from "$effects/render.ts";
import { handlerFor } from "@radish/effect-system";
import { serializeFragments } from "@radish/htmlcrunch";
import { assertExists } from "@std/assert";
import { transformNode } from "../transforms/transform-node.ts";

/**
 * Renders a component
 *
 * @performs
 * - `manifest/get`
 * - `render/transformNode`
 */
export const handleRenderComponents = handlerFor(
  render.component,
  async (element) => {
    assertExists(element.templateLoader);
    const nodes = await Promise.all(
      element.templateLoader().map(transformNode),
    );
    return serializeFragments(nodes);
  },
);
