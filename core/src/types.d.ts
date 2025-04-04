import type { WalkEntry } from "@std/fs/walk";
import type { ManifestController } from "./generate/manifest.ts";
import type { SpeculationRules } from "./generate/speculationrules.ts";
import type { App, FileCache } from "./server/app.ts";
import type {
  ImportMapController,
  ImportMapOptions,
} from "./generate/impormap.ts";

export type Maybe<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

/**
 * Prettifies types (intersections etc) by ensuring type expansion
 */
export type Prettify<T> =
  & {
    [K in keyof T]: T[K];
  }
  & {};

/**
 * Requires only certain keys of T
 */
export type Required<T, K extends keyof T> = Prettify<
  {
    [P in keyof T as P extends K ? P : never]-?: T[P];
  } & Omit<T, K>
>;

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
  manifest: ManifestBase;
  importmapController: ImportMapController;
  fileCache: FileCache;
  /**
   * The AST returned by a previous transform plugin
   */
  ast?: any;
  /**
   * Contains the custom meta-data annotations set by previous transform plugins on this file
   */
  meta?: { [plugin: string]: any } | null | undefined;
}

export type BuildOptions = Record<string, any>;

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
   * The target path in the build folder
   */
  target: string;
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

export type HmrContext = {
  app: App;
  /**
   * The list of paths (files or folders) affected by the event which will be re-processed in the provided order during the incremental rebuild phase
   */
  paths: string[];
};

export type ManifestBase = Record<string, any> & {
  imports: Record<string, string[]>;
};

export type ManifestContext = {
  manifest: ManifestBase;
  fileCache: FileCache;
};

export interface Plugin {
  /**
   * The name of the plugin with a `radish-plugin-` prefix
   */
  name: string;
  /**
   * Updates the build order
   *
   * Kind: sequential
   */
  buildStart?: (
    entries: WalkEntry[],
    manifest: ManifestBase,
  ) => WalkEntry[];
  /**
   * Modifies the config before it's resolved. This hook receives the user config with the CLI args of the currently running command
   */
  config?: (config: Config, args: Args) => Config;
  /**
   * Reads the resolved config object, which is useful when a plugin needs to adjust its behavior based on the config or command being run
   */
  configResolved?: (config: ResolvedConfig) => void;
  /**
   * This hook allows to modify the path where the file will be emitted
   *
   * Kind: first
   */
  emit?: (path: string) => string | null;
  /**
   * Handles the side effects of the hot update before the incremental rebuild phase. This hook has access to information about the fs event emitted and the context, allowing to update the manifest, do IO etc.
   *
   * The `event` and `context` objects are shared in a sequence of `handleHotUpdate` calls and can be modified directly to adjust the behavior of following plugins as well as the rebuild phase.
   *
   * Kind: sequential
   */
  handleHotUpdate?: (event: HmrEvent, context: HmrContext) => void;
  /**
   * Runs before the manifest generation. This hook is an initialization phase allowing to modify the manifest object by adding the required keys.
   *
   * Kind: sequential
   */
  manifestStart?: (manifestController: ManifestController) => ManifestBase;
  /**
   * The main hook of the manifest generation, called on every entry
   *
   * Kind: sequential
   */
  manifest?: (
    entry: WalkEntry,
    context: ManifestContext,
  ) => void;
  /**
   * Performs a transform before the manifest is written on disk. This allows to modify paths, imports etc.
   *
   * Kind: sequential
   */
  manifestWrite?: (content: string) => string;
  /**
   * Transforms individual files
   *
   * If you return an `ast` object or `meta` properties, they will be passed to subsequent transforms via the `TransformContext`. This can avoid the need to re-parse files
   *
   * Kind: sequential
   */
  transform?: (
    code: string,
    path: string,
    context: TransformContext,
  ) => MaybePromise<TransformResult>;
}

export interface Config {
  /**
   * Options for the builder
   */
  build?: BuildOptions;
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
     * Specifies the location of the node_modules folder relative to the deno.json file to serve local dependencies from in dev mode, like `.` or `..` etc.
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

type Args = Readonly<{
  dev: boolean;
  importmap: boolean;
  manifest: boolean;
  build: boolean;
}>;

export interface ResolvedConfig extends Required<Config, "plugins"> {
  /**
   * The arguments of the current running command
   */
  args: Args;
}
