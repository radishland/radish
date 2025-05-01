import { applyDirectives } from "./apply_directives.ts";
import { insertTemplates } from "./insert_templates.ts";

export const handleTransforms = [
  applyDirectives,
  insertTemplates,
];
