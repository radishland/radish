import { createEffect } from "./effects.ts";

interface Env {
  load: () => void;
  get: (key: string) => unknown;
}

export const env = {
  /**
   * Makes the environment variables available
   */
  load: createEffect<Env["load"]>("env/load"),
  /**
   * Returns the parsed value of an environment variable
   */
  get: createEffect<Env["get"]>("env/get"),
};
