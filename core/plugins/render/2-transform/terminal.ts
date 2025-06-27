import { render } from "$effects/render.ts";
import { handlerFor } from "@radish/effect-system";

/**
 * @hooks `render/transform-node`
 */
export const onRenderTransformNodeTerminal = handlerFor(
  render.transformNode,
  (_path, node) => node,
);
