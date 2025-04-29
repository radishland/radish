import { parse } from "@std/dotenv";
import { join } from "@std/path";
import { generatedFolder } from "../constants.ts";
import { config } from "../effects/config.ts";
import { handlerFor } from "../effects/effects.ts";
import { env } from "../effects/env.ts";
import { Handler } from "../effects/handlers.ts";
import { hot } from "../effects/hot-update.ts";
import { io } from "../effects/io.ts";
import type { Plugin } from "../types.d.ts";
import { stringifyObject } from "../utils/stringify.ts";

/**
 * This module implements the {@linkcode env} effect
 *
 * {@linkcode env.load} generates an `env.ts` module to import environment
 * variables from with the `$env` alias
 *
 * @example
 * ```ts
 * import { API_KEY } from "$env";
 * ```
 *
 * This gives autocompletion on keys and will allow further refinements like preventing leaking
 * variables in the browser by specifying rules or inlining public env imports
 *
 * @module
 */

/**
 * Path to the generated env module
 */
const envModulePath = join(generatedFolder, "env.ts");

/**
 * Implements {@linkcode env.load} by generating an `env.ts` module to import environment
 * variables from.
 *
 * This gives autocompletion on keys and will allow further refinements like preventing leaking
 * variables in the browser by specifying rules or inlining public env imports
 */
export const pluginEnv: Plugin = {
  name: "plugin-env",
  handlers: [
    handlerFor(env.load, load),
    handlerFor(env.get, (key: string) => {
      const value = Deno.env.get(key);
      return parseValue(value);
    }),
    handlerFor(hot.update, async ({ event, paths }) => {
      if (event.path === await getEnvPath()) {
        await load();
      }

      return Handler.continue({ event, paths });
    }),
  ],
};

async function load() {
  const envPath = await getEnvPath();

  if (envPath) {
    const envFile = await io.readFile(envPath);
    const envObject = parse(envFile);
    let envModule = "";

    for (const [key, value] of Object.entries(envObject)) {
      envModule += `export const ${key} = ${parseValue(value)};\n`;
      if (Deno.env.get(key) !== undefined) continue;
      Deno.env.set(key, value);
    }

    await io.writeFile(envModulePath, envModule);
  }
}

/**
 * Parses booleans, numbers, JSON objects, quotes strings
 */
const parseValue = (value: string | undefined) => {
  if (value === "" || value === undefined) return undefined;

  if (Boolean(value).toString() === value) {
    return Boolean(value);
  }

  if (Number(value).toString() === value) {
    return Number(value);
  }

  try {
    const object = JSON.parse(value);
    return stringifyObject(object);
  } catch {
    return JSON.stringify(value);
  }
};

const getEnvPath = async () => {
  const { env } = await config.read();
  return env?.envPath ?? ".env";
};
