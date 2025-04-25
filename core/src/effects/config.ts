import type { Config, ResolvedConfig } from "../types.d.ts";
import { createEffect, type EffectWithType } from "./effects.ts";

interface ConfigEffect {
  read: () => ResolvedConfig;
  transform: (config: Config) => Config;
}

export const config: {
  read: EffectWithType<[], ResolvedConfig>;
  transform: EffectWithType<[config: Config], Config>;
} = {
  /**
   * Returns the resolved config object
   */
  read: createEffect<ConfigEffect["read"]>("config/read"),
  /**
   * Transforms the config object before it's resolved.
   */
  transform: createEffect<ConfigEffect["transform"]>(
    "config/transform",
  ),
};

export const denoConfig: {
  read: EffectWithType<[], Record<string, any>>;
} = {
  /**
   * Returns the parsed deno config and throws if it can't find it
   */
  read: createEffect<() => Record<string, any>>("deno.config/read"),
};
