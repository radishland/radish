import type { Transform } from "./types.d.ts";

import strip from "@fcrozatier/type-strip";

/**
 * Strip Types
 *
 * Remove all type annotations and comments
 */
export const stripTypes: Transform = ({ content }) => {
  return strip(content, { removeComments: true, tsToJsModuleSpecifiers: true });
};
