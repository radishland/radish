import type { Manifest } from "./generate/manifest.ts";
import type { SpeculationRules } from "./generate/speculationrules.ts";

export type Maybe<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

type TransformResult = string | null | Partial<SourceDescription>;

interface SourceDescription {
  code: string;
  ast?: any;
  meta?: { [plugin: string]: any } | null;
}

export interface TransformContext {
  /**
   * The format of the file as returned by `extname`
   */
  format: string;
  manifest: Manifest;
  /**
   * The AST returned by a previous transform plugin
   */
  ast?: any;
  /**
   * Contains the custom meta-data annotations set by previous transform plugins on this file
   */
  meta?: { [plugin: string]: any } | null;
}

export type BuildOptions = {
  /**
   * The speculation rules of the whole site
   *
   * https://github.com/WICG/nav-speculation/blob/main/triggers.md
   *
   * Spec: https://wicg.github.io/nav-speculation/speculation-rules.html
   */
  speculationRules?: SpeculationRules;
};

export interface Plugin {
  /**
   * The name of the plugin with a `radish-plugin-` prefix
   */
  name: string;
  /**
   * Reads the resolved config object, which is useful when a plugin needs to adjust its behavior based on the config or command being run
   */
  configResolved?: (options: BuildOptions) => void;
  /**
   * Transforms individual files
   *
   * If you return an `ast` object or `meta` properties, they will be passed to subsequent transforms via the `TransformContext`. This can avoid the need to re-parse files
   */
  transform?: (
    code: string,
    path: string,
    context: TransformContext,
  ) => TransformResult;
  /**
   * This hook allows to modify the path where the file will be emitted
   */
  emit?: (path: string) => string | null;
}

export type Config = {
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
     * Specifies the location of the node_modules folder relative to the deno.json file to serve local dependencies from in dev mode, like `.` or `..` etc.
     *
     * @default `.`
     */
    nodeModulesRoot?: string;
  };
  plugins?: Plugin[];
};
