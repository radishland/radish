import { render } from "$effects/render.ts";
import { id } from "$lib/utils/algebraic-structures.ts";
import { handlerFor } from "@radish/effect-system";
import { handleApplyDirectivesTransform } from "./apply-directives.ts";
import { handleInsertTemplatesTransform } from "./insert-templates.ts";

export const handleTransformBase = handlerFor(render.transformNode, id);

/**
 * @performs
 * - `manifest/get`
 */
export const handleTransformNode = [
  handleApplyDirectivesTransform,
  handleInsertTemplatesTransform,
  handleTransformBase,
];
