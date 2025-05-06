import { handlerFor } from "../../../effects/effects.ts";
import { render } from "../../../effects/render.ts";
import { id } from "../../../utils/algebraic-structures.ts";
import { handleApplyDirectivesTransform } from "./apply_directives.ts";
import { handleInsertTemplatesTransform } from "./insert_templates.ts";

export const handleTransformBase = handlerFor(render.transformNode, id);

export const handleTransformNode = [
  handleApplyDirectivesTransform,
  handleInsertTemplatesTransform,
  handleTransformBase,
];
