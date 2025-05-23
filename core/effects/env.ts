import { createEffect, type Effect } from "@radish/effect-system";

interface EnvOps {
  load: () => void;
  get: (key: string) => unknown;
}

export const env: {
  /**
   * Makes the environment variables available
   */
  load: () => Effect<void>;
  /**
   * Returns the parsed value of an environment variable
   */
  get: (key: string) => Effect<unknown>;
} = {
  load: createEffect<EnvOps["load"]>("env/load"),
  get: createEffect<EnvOps["get"]>("env/get"),
};
