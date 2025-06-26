import { render } from "$effects/render.ts";
import { handlerFor, id } from "@radish/effect-system";

/**
 * @hooks `render/transform-node`
 */
export const onRenderTransformNodeTerminal = handlerFor(
  render.transformNode,
  id,
);
