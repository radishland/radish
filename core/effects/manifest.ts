import { generatedFolder } from "$lib/conventions.ts";
import { createEffect, type Effect } from "@radish/effect-system";
import type { WalkEntry } from "@std/fs";
import { join } from "@std/path";
import type { ManifestBase } from "../types.d.ts";

/**
 * The path to the manifest file
 */
export const manifestPath: string = join(generatedFolder, "manifest.ts");

interface ManifestOperations {
  load: () => ManifestBase;
  set: (manifest: ManifestBase) => void;
  get: () => ManifestBase;
  update: (entry: WalkEntry) => void;
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
