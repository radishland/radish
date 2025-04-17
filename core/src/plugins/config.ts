import { assertExists } from "@std/assert";
import { existsSync } from "@std/fs";
import * as JSONC from "@std/jsonc";
import { handlerFor } from "../effects/effects.ts";
import type { Plugin } from "../types.d.ts";
import { io } from "../effects/io.ts";
import { denoConfig } from "../effects/config.ts";

export const pluginConfig: Plugin = {
  name: "config-plugin",
  handlers: [
    handlerFor(denoConfig.read, async () => {
      const fileName = ["deno.json", "deno.jsonc"]
        .find((fileName) => existsSync(fileName));
      assertExists(fileName, "deno config not found");

      const content = await io.readFile(fileName);

      return fileName.endsWith(".json")
        ? JSON.parse(content)
        : JSONC.parse(content);
    }),
  ],
};
