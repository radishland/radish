import { generatedFolder } from "$lib/conventions.ts";
import { createEffect, type Effect } from "@radish/effect-system";
import type { WalkEntry } from "@std/fs";
import { join } from "@std/path";
import type { ManifestBase } from "../types.d.ts";

/**
 * The path to the manifest file
 */
export const manifestPath: string = join(generatedFolder, "manifest.ts");

export type ManifestUpdateOptions = { root?: string };

interface ManifestOperations {
  load: () => ManifestBase;
  set: (manifest: ManifestBase) => void;
  get: () => ManifestBase;
  updateEntry: (entry: WalkEntry) => void;
  updateEntries: (
    glob: string,
    options?: ManifestUpdateOptions | undefined,
  ) => void;
  write: () => void;
}

/**
 * The manifest effect
 */
export const manifest: {
  /**
   * Sets the manifest object to a given value
   */
  set: (manifest: ManifestBase) => Effect<void>;
  /**
   * Loads the manifest.ts file in memory
   */
  load: () => Effect<ManifestBase>;
  /**
   * Returns the manifest object
   */
  get: () => Effect<ManifestBase>;
  /**
   * Updates the manifest object
   */
  updateEntry: (entry: WalkEntry) => Effect<void>;
  /**
   * Updates all entries matching the glob
   */
  updateEntries: (
    glob: string,
    options?: ManifestUpdateOptions | undefined,
  ) => Effect<void>;
  /**
   * Serializes the manifest object and saves it to disk
   */
  write: () => Effect<void>;
} = {
  load: createEffect<ManifestOperations["load"]>("manifest/load"),
  set: createEffect<ManifestOperations["set"]>("manifest/set"),
  get: createEffect<ManifestOperations["get"]>("manifest/get"),
  updateEntry: createEffect<ManifestOperations["updateEntry"]>(
    "manifest/update-entry",
  ),
  updateEntries: createEffect<ManifestOperations["updateEntries"]>(
    "manifest/update-entries",
  ),
  write: createEffect<ManifestOperations["write"]>("manifest/write"),
};
