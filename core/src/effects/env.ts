import { createEffect } from "./effects.ts";

interface Env {
  load: () => void;
}

export const env = {
  /**
   * Makes the environment variables available
   */
  load: createEffect<Env["load"]>("env/load"),
};
