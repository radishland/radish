import type { Config, ResolvedConfig } from "../types.d.ts";
import { createEffect, createTransformEffect } from "./effects.ts";

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
