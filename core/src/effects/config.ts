import { assertExists } from "@std/assert";
import { existsSync } from "@std/fs";
import * as JSONC from "@std/jsonc";
import type { Config, Plugin, ResolvedConfig } from "../types.d.ts";
import { createEffect, createTransformEffect, handlerFor } from "./effects.ts";
import { io } from "./io.ts";

interface ConfigEffect {
  read: () => ResolvedConfig;
  transform: (config: Config) => Config;
}

export const config = {
  /**
   * Returns the resolved config object
   */
  read: createEffect<ConfigEffect["read"]>("config/read"),
  /**
   * Transforms the config object before it's resolved.
   */
  transform: createTransformEffect<ConfigEffect["transform"]>(
    "config/transform",
  ),
};

export const denoConfig = {
  /**
   * Returns the parsed deno config and throws if it can't find it
   */
  read: createEffect<() => Record<string, any>>("config/read"),
};

export const pluginConfig: Plugin = {
  name: "config-plugin",
  handlers: [
    handlerFor(denoConfig.read, async () => {
      const fileName = ["deno.json", "deno.jsonc"]
        .find((fileName) => existsSync(fileName));
      assertExists(fileName, "deno config not found");

      const content = await io.readFile(fileName);

      return fileName?.endsWith(".json")
        ? JSON.parse(content)
        : JSONC.parse(content);
    }),
  ],
};
