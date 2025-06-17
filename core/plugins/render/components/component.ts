import { io } from "$effects/mod.ts";
import { render } from "$effects/render.ts";
import { handlerFor } from "@radish/effect-system";
import { serializeFragments, shadowRoot } from "@radish/htmlcrunch";
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
    assertExists(element.templatePath);
    const template = await io.read(element.templatePath);
    const fragments = shadowRoot.parseOrThrow(template);
    const nodes = await Promise.all(fragments.map(transformNode));
    return serializeFragments(nodes);
  },
);
