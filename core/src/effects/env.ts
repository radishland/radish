import { createEffect, type EffectWithType } from "@radish/effect-system";

interface Env {
  load: () => void;
  get: (key: string) => unknown;
}

export const env: {
  load: EffectWithType<[], void>;
  get: EffectWithType<[key: string], unknown>;
} = {
  /**
   * Makes the environment variables available
   */
  load: createEffect<Env["load"]>("env/load"),
  /**
   * Returns the parsed value of an environment variable
   */
  get: createEffect<Env["get"]>("env/get"),
};
