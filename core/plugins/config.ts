import { config, denoConfig } from "$effects/config.ts";
import { fs } from "$effects/fs.ts";
import { handlerFor, type Plugin } from "@radish/effect-system";
import { unreachable } from "@std/assert";
import * as JSONC from "@std/jsonc";
import { join } from "@std/path";
import { id } from "../utils/algebraic-structures.ts";

/**
 * The config plugin
 *
 * @performs
 * - `fs/read`
 */
export const pluginConfig: Plugin = {
  name: "plugin-config",
  handlers: [
    handlerFor(config.transform, id),
    handlerFor(denoConfig.read, async () => {
      for (const filename of ["deno.json", "deno.jsonc"]) {
        if (await fs.exists(join(Deno.cwd(), filename))) {
          const content = await fs.read(filename);

          return filename.endsWith(".json")
            ? JSON.parse(content)
            : JSONC.parse(content);
        }
      }

      unreachable(": Deno config not found");
    }),
  ],
};
