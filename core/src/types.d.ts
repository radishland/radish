import type { Handlers } from "./effects/effects.ts";
import type { ImportMapOptions } from "./plugins/importmap.ts";
import type { SpeculationRules } from "./generate/speculationrules.ts";
import type { LoadOptions } from "@std/dotenv";

export type Maybe<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

export type HmrEvent = {
  /**
   * Indicates whether the source of the event is a file
   */
  isFile: boolean;
  /**
   * The path of the entry triggering the event
   */
  path: string;
  /**
   * The path of the original entry in the case of a rename event
   */
  from?: string;
  /**
   * The timestamp the event was triggered at
   */
  timestamp: number;
  /**
   * The kind of the underlying `FsEvent`
   */
  kind: Deno.FsEvent["kind"];
};

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
  env?: {
    /**
     * Path to the env file. Set to `null` to prevent the default value from being used.
     *
     * @default ".env"
     */
    envPath?: LoadOptions["envPath"];
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

export type CLIArgs = Readonly<{
  build: boolean;
  dev: boolean;
  env: boolean;
  importmap: boolean;
  manifest: boolean;
  start: boolean;
}>;

export interface ResolvedConfig extends Config {
  /**
   * The arguments of the current running command
   */
  args: CLIArgs;
}
