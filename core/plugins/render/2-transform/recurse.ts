import { render } from "$effects/render.ts";
import { handlerFor } from "@radish/effect-system";

export const onRenderTransformNodesRecurse = handlerFor(
  render.transformNodes,
  async (path, nodes) => {
    const transformed = await Promise.all(
      nodes.map(async (node) => await render.transformNode(path, node)),
    );
    const transformedFlat = transformed.flat();

    for (const node of transformedFlat) {
      if (node.children?.length) {
        node.children = await render.transformNodes(path, node.children);
      }
    }

    return transformedFlat;
  },
);
