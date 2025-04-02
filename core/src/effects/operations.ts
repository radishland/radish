import type { WalkEntry } from "@std/fs";
import type { MaybePromise } from "../types.d.ts";
import { defineOperation } from "./registry.ts";

/**
 * Defines built-in operations
 */

/**
 * IO Operations
 */

export const readTextFileSync = defineOperation<(path: string) => string>(
  "read-text-file-sync",
  "standalone",
);

export const readTextFileAsync = defineOperation<
  (path: string) => Promise<string>
>(
  "read-text-file-async",
  "standalone",
);

export const writeTextFileSync = defineOperation<typeof Deno.writeTextFileSync>(
  "write-text-file-sync",
  "standalone",
);

/**
 * TODO: WriteFile implementation calls invalidate in FileCache and ensureDir
 */
export const writeTextFileAsync = defineOperation<typeof Deno.writeTextFile>(
  "write-text-file-async",
  "standalone",
);

/**
 * Build Operations
 */

export const buildOrder = defineOperation<
  (entries: WalkEntry[]) => WalkEntry[]
>("build-order", "chained");

export const buildTransform = defineOperation<
  (
    args: { code: string; path: string },
  ) => MaybePromise<{ code: string; path: string }>
>("transform", "chained");

export const emitOperation = defineOperation<
  (path: string) => string | null | undefined
>("emit", "first-non-nullable");

defineOperation("process-file", "first");
defineOperation("build", "first");
