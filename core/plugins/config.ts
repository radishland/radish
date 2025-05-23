import { assertExists } from "@std/assert";
import { existsSync } from "@std/fs";
import * as JSONC from "@std/jsonc";
import { handlerFor } from "@radish/effect-system";
import type { Plugin } from "../types.d.ts";
import { io } from "$effects/io.ts";
import { config, denoConfig } from "$effects/config.ts";
import { id } from "../utils/algebraic-structures.ts";

/**
 * The config plugin
 *
 * @performs
 * - `io/read`
 */
export const pluginConfig: Plugin = {
  name: "plugin-config",
  handlers: [
    handlerFor(config.transform, id),
    handlerFor(denoConfig.read, async () => {
      const fileName = ["deno.json", "deno.jsonc"]
        .find((fileName) => existsSync(fileName));
      assertExists(fileName, "deno config not found");

      const content = await io.read(fileName);

      return fileName.endsWith(".json")
        ? JSON.parse(content)
        : JSONC.parse(content);
    }),
  ],
};
