import { render } from "$effects/render.ts";
import { id } from "$lib/utils/algebraic-structures.ts";
import { handlerFor } from "@radish/effect-system";
import { handleRenderTransformApplyDirectives } from "./apply-directives.ts";
import { handleRenderTransformInsertTemplate } from "./insert-template/insert-templates.ts";

/**
 * Canonical handler for `render/transformNode`
 *
 * @performs void
 */
export const handleRenderTransformTerminal = handlerFor(
  render.transformNode,
  id,
);

/**
 * @performs
 * - `manifest/get`
 */
export const handleTransformNode = [
  handleRenderTransformApplyDirectives,
  handleRenderTransformInsertTemplate,
  handleRenderTransformTerminal,
];
