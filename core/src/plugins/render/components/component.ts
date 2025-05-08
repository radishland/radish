import { serializeFragments } from "@radish/htmlcrunch";
import { handlerFor } from "@radish/effect-system";
import { render } from "$effects/render.ts";
import { transformNode } from "../transforms/transform-node.ts";
import { assertExists } from "@std/assert";

export const handleComponents = handlerFor(
  render.component,
  async (element) => {
    assertExists(element.templateLoader);
    const nodes = await Promise.all(
      element.templateLoader().map(transformNode),
    );
    return serializeFragments(nodes);
  },
);
