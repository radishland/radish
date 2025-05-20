import type { Handlers } from "@radish/effect-system";
import type { SpeculationRules } from "./generate/speculationrules.ts";
import type { ImportMapOptions } from "./plugins/importmap/importmap.ts";

export type MaybePromise<T> = T | Promise<T>;

export interface ManifestBase extends Record<string, any> {
  /**
   * Maps module paths to their import specifiers
   */
  imports: Record<string, string[]>;
}

export interface Plugin {
  /**
   * The name of the plugin
   */
  name: string;
  handlers: Handlers;
}

export interface Config {
  /**
   * The arguments of the current running command
   */
  args?: CLIArgs;
  env?: {
    /**
     * Path to the env file.
     *
     * @default ".env"
     */
    envPath?: string;
  };
  importmap?: ImportMapOptions;
  /**
   * Array of plugins to use
   */
  plugins?: Plugin[];
  router?: {
    /**
     * An object mapping matcher names to their corresponding regexp definition.
     *
     * Matchers allow to filter dynamic routes like `[id=number]` with a "number" matcher.
     * For example:
     *
     * ```ts
     * matchers: {
     *  number: /^\d+$/
     * }
     * ```
     */
    matchers?: Record<string, RegExp>;
    /**
     * Specifies the location of the node_modules folder relative to the deno.json file
     * to serve local dependencies from in dev mode, like `.` or `..` etc.
     *
     * @default `.`
     */
    nodeModulesRoot?: string;
  };
  /**
   * The speculation rules of the whole site
   *
   * https://github.com/WICG/nav-speculation/blob/main/triggers.md
   *
   * Spec: https://wicg.github.io/nav-speculation/speculation-rules.html
   */
  speculationRules?: SpeculationRules;
}

export type CLIArgs = Partial<{
  build: boolean;
  dev: boolean;
  env: boolean;
  importmap: boolean;
  manifest: boolean;
  server: boolean;
}>;
