import { handlerFor } from "../../../effects/effects.ts";
import { render } from "../../../effects/render.ts";
import { id } from "../../../utils/algebraic-structures.ts";
import { applyDirectives } from "./apply_directives.ts";
import { insertTemplates } from "./insert_templates.ts";

const baseHandler = handlerFor(render.transformNode, id);

export const handleTransforms = [
  applyDirectives,
  insertTemplates,
  baseHandler,
];
