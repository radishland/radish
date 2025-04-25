import strip from "@fcrozatier/type-strip";
import { extname, join } from "@std/path";
import { buildFolder, ts_extension_regex } from "../constants.ts";
import { handlerFor } from "../effects/effects.ts";
import { io } from "../effects/io.ts";
import type { Plugin } from "../types.d.ts";
import { Handler } from "../effects/handlers.ts";

/**
 * Strips Types
 *
 * Removes type annotations and comments and handles path rewriting
 */
export const pluginStripTypes: Plugin = {
  name: "plugin-strip-types",
  handlers: [
    handlerFor(io.emitTo, (path) => {
      if (extname(path) === ".ts" && !path.endsWith(".d.ts")) {
        return join(buildFolder, path).replace(ts_extension_regex, ".js");
      }
      return Handler.continue(path);
    }),
    handlerFor(io.transformFile, ({ path, content }) => {
      if (extname(path) === ".ts" && !path.endsWith(".d.ts")) {
        return {
          path,
          content: strip(content, {
            removeComments: true,
            pathRewriting: true,
          }),
        };
      }
      return Handler.continue({ path, content });
    }),
  ],
};
