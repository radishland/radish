import type { WalkEntry } from "@std/fs";
import { join } from "@std/path";
import { generatedFolder } from "../constants.ts";
import type { ManifestBase } from "../types.d.ts";
import { createEffect, type Effect } from "@radish/effect-system";

/**
 * The path to the manifest file
 */
export const manifestPath: string = join(generatedFolder, "manifest.ts");

type UpdateManifestParam = { entry: WalkEntry; manifestObject: ManifestBase };

interface ManifestOperations {
  setLoader: (loader: () => Promise<ManifestBase>) => void;
  load: () => void;
  get: () => ManifestBase;
  update: (param: UpdateManifestParam) => UpdateManifestParam;
  write: () => void;
}

/**
 * The manifest effect
 */
export const manifest: {
  /**
   * Sets the loader function used by `manifest/load`
   */
  setLoader: (loader: () => Promise<ManifestBase>) => Effect<void>;
  /**
   * Reads the manifest.ts file and loads its content in memory
   */
  load: () => Effect<void>;
  /**
   * Returns the manifest object
   */
  get: () => Effect<ManifestBase>;
  /**
   * Updates the manifest object in memory
   */
  update: (param: UpdateManifestParam) => Effect<UpdateManifestParam>;
  /**
   * Serializes the manifest object and saves it to disk
   */
  write: () => Effect<void>;
} = {
  setLoader: createEffect<ManifestOperations["setLoader"]>(
    "manifest/setLoader",
  ),
  load: createEffect<ManifestOperations["load"]>("manifest/load"),
  get: createEffect<ManifestOperations["get"]>("manifest/get"),
  update: createEffect<ManifestOperations["update"]>(
    "manifest/update",
  ),
  write: createEffect<ManifestOperations["write"]>("manifest/write"),
};
