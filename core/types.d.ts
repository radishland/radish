import type { SpeculationRules } from "./generate/speculationrules.ts";
import type { ImportMapOptions } from "./plugins/importmap/importmap.ts";

export type MaybePromise<T> = T | Promise<T>;

export interface ManifestBase extends Record<string, any> {
  /**
   * Maps module paths to their import specifiers
   */
  imports: Record<string, string[]>;
}

export interface Config {
  /**
   * The arguments of the current running command
   */
  args?: CLIArgs;
  /**
   * The build options
   */
  build?: {
    /**
     * Entries matching the patterns specified by this option are excluded from the build
     *
     * @default
     * [/(\.d|\.test|\.spec)\.ts$/]
     */
    skip?: RegExp[];
  };
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
   * The manifest options
   */
  manifest?: {
    /**
     * Entries matching the patterns specified by this option are excluded from the manifest
     *
     * @default
     * [/(\/d|\.test|\.spec)\.ts$/]
     */
    skip?: RegExp[];
  };
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
  server?: {
    /**
     * The port to listen on.
     *
     * @default {1235} */
    port?: number;
    /**
     * A literal IP address or host name that can be resolved to an IP address.
     *
     * @default {"127.0.0.1"} */
    hostname?: string;
    /**
     * The callback which is called when the server starts listening.
     *
     * @default {() => console.log\(`Listening at localhost:1235`)}
     */
    onListen?: (localAddr: Deno.NetAddr) => void;
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
