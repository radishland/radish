import strip from "@fcrozatier/type-strip";
import { extname, join } from "@std/path";
import { handlerFor, transformerFor } from "../effects/effects.ts";
import { io } from "../effects/io.ts";
import type { Plugin } from "../types.d.ts";
import { Option } from "../algebraic-structures.ts";
import { buildFolder, ts_extension_regex } from "../constants.ts";

/**
 * Strips Types
 *
 * Removes type annotations and comments and handles path rewriting
 */
export const pluginStripTypes: Plugin = {
  name: "radish-plugin-strip-types",
  handlers: [
    handlerFor(io.emitTo, (path) => {
      if (extname(path) === ".ts" && !path.endsWith(".d.ts")) {
        return Option.some(
          join(buildFolder, path).replace(ts_extension_regex, ".js"),
        );
      }
      return Option.none();
    }),
  ],
  transformers: [
    transformerFor(io.transformFile, ({ path, content }) => {
      if (extname(path) === ".ts" && !path.endsWith(".d.ts")) {
        return Option.some({
          path,
          content: strip(content, {
            removeComments: true,
            pathRewriting: true,
          }),
        });
      }
      return Option.none();
    }),
  ],
};
