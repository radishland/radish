import type { WalkEntry } from "@std/fs";
import type { DenoArgs } from "../start.ts";
import type { Config, MaybePromise, ResolvedConfig } from "../types.d.ts";
import { defineOperation, type Operation } from "./registry.ts";

/**
 * Defines built-in operations
 */

/**
 * IO Operations
 */

export const readTextFileSync: Operation<
  (path: string) => string,
  "standalone"
> = defineOperation("read-text-file-sync", "standalone");

export const readTextFileAsync: Operation<
  (path: string) => Promise<string>,
  "standalone"
> = defineOperation("read-text-file-async", "standalone");

export const writeTextFileSync: Operation<
  typeof Deno.writeTextFileSync,
  "standalone"
> = defineOperation("write-text-file-sync", "standalone");

/**
 * TODO: WriteFile implementation calls invalidate in FileCache and ensureDir
 */
export const writeTextFileAsync: Operation<
  typeof Deno.writeTextFile,
  "standalone"
> = defineOperation("write-text-file-async", "standalone");

/**
 * Config
 */

/**
 * Modifies the config object before it's resolved.
 *
 * Receives the user config with the CLI args of the currently running command
 */
export const modifyConfig: Operation<
  (args: { config: Config; args: DenoArgs }) => void,
  "sequential"
> = defineOperation("modify-config", "sequential");

/**
 * Reads the resolved config
 */
export const readConfig: Operation<
  () => ResolvedConfig,
  "first-non-nullable"
> = defineOperation("read-config", "first-non-nullable");

/**
 * Build Operations
 */

/**
 * Updates the build order of a list of entries
 */
export const buildOrder: Operation<
  (entries: WalkEntry[]) => WalkEntry[],
  "chained"
> = defineOperation("build-order", "chained");

/**
 * Transforms individual files
 */
export const buildTransform: Operation<
  (
    args: { code: string; path: string },
  ) => MaybePromise<{ code: string; path: string }>,
  "chained"
> = defineOperation("transform", "chained");

/**
 * Modifies the output path where the file will be emitted
 */
export const emitOperation: Operation<
  (path: string) => string | null | undefined,
  "first-non-nullable"
> = defineOperation("emit", "first-non-nullable");

defineOperation("process-file", "first");
defineOperation("build", "first");
