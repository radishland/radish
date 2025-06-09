import type { WalkEntry } from "@std/fs";
import { join } from "@std/path";
import { generatedFolder } from "$lib/conventions.ts";
import type { ManifestBase, MaybePromise } from "../types.d.ts";
import { createEffect, type Effect } from "@radish/effect-system";

/**
 * The path to the manifest file
 */
export const manifestPath: string = join(generatedFolder, "manifest.ts");

interface ManifestOperations {
  load: () => void;
  set: (loader: () => MaybePromise<ManifestBase>) => void;
  get: () => ManifestBase;
  update: (entry: WalkEntry) => void;
  write: () => void;
}

/**
 * The manifest effect
 */
export const manifest: {
  /**
   * Sets the manifest loader and calls it
   */
  set: (loader: () => MaybePromise<ManifestBase>) => Effect<void>;
  /**
   * Loads the manifest.ts file in memory
   */
  load: () => Effect<void>;
  /**
   * Returns the manifest object
   */
  get: () => Effect<ManifestBase>;
  /**
   * Updates the manifest object
   */
  update: (entry: WalkEntry) => Effect<void>;
  /**
   * Serializes the manifest object and saves it to disk
   */
  write: () => Effect<void>;
} = {
  load: createEffect<ManifestOperations["load"]>("manifest/load"),
  set: createEffect<ManifestOperations["set"]>("manifest/set"),
  get: createEffect<ManifestOperations["get"]>("manifest/get"),
  update: createEffect<ManifestOperations["update"]>(
    "manifest/update",
  ),
  write: createEffect<ManifestOperations["write"]>("manifest/write"),
};
