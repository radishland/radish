import { build } from "$effects/mod.ts";
import { ts_extension_regex } from "$lib/constants.ts";
import { buildFolder } from "$lib/conventions.ts";
import strip from "@fcrozatier/type-strip";
import { Handler, handlerFor, type Plugin } from "@radish/effect-system";
import { extname, join } from "@std/path";

/**
 * The type-stripping plugin
 *
 * Removes type annotations and comments and handles path rewriting
 *
 * @hooks
 * - `build/dest`
 * - `build/transform`
 */
export const pluginStripTypes: Plugin = {
  name: "plugin-strip-types",
  handlers: [
    handlerFor(build.dest, (path) => {
      if (extname(path) === ".ts" && !path.endsWith(".d.ts")) {
        return join(buildFolder, path).replace(ts_extension_regex, ".js");
      }
      return Handler.continue(path);
    }),
    handlerFor(build.transform, (path, content) => {
      if (extname(path) === ".ts" && !path.endsWith(".d.ts")) {
        return strip(content, {
          removeComments: true,
          pathRewriting: true,
        });
      }
      return Handler.continue(path, content);
    }),
  ],
};
