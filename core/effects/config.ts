import type { Config } from "../types.d.ts";
import { createEffect, type Effect } from "@radish/effect-system";

interface ConfigOps {
  read: () => Config;
  transform: (config: Config) => Config;
}

/**
 * The config effect
 */
export const config: {
  /**
   * Returns the resolved config object
   */
  read: () => Effect<Config>;
  /**
   * Transforms the config object before it's resolved.
   */
  transform: (config: Config) => Effect<Config>;
} = {
  read: createEffect<ConfigOps["read"]>("config/read"),
  transform: createEffect<ConfigOps["transform"]>(
    "config/transform",
  ),
};

export const denoConfig: {
  /**
   * Returns the parsed deno config and throws if it can't find it
   */
  read: () => Effect<Record<string, any>>;
} = {
  read: createEffect<() => Record<string, any>>("deno.config/read"),
};
