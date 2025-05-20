import type { Config } from "../types.d.ts";
import { createEffect, type EffectWithId } from "@radish/effect-system";

interface ConfigEffect {
  read: () => Config;
  transform: (config: Config) => Config;
}

export const config: {
  read: EffectWithId<[], Config>;
  transform: EffectWithId<[config: Config], Config>;
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
  read: EffectWithId<[], Record<string, any>>;
} = {
  /**
   * Returns the parsed deno config and throws if it can't find it
   */
  read: createEffect<() => Record<string, any>>("deno.config/read"),
};
