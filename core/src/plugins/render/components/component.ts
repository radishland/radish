import { serializeFragments } from "@radish/htmlcrunch";
import { handlerFor } from "../../../effects/effects.ts";
import { render } from "../../../effects/render.ts";
import { transformNode } from "../transforms/transform_node.ts";

export const handleComponents = handlerFor(
  render.component,
  async (element) => {
    if (!element?.templateLoader) return;
    const nodes = await Promise.all(
      element.templateLoader().map(transformNode),
    );
    return serializeFragments(nodes);
  },
);
