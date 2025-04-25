import type { WalkEntry } from "@std/fs";
import { join } from "@std/path";
import { generatedFolder } from "../constants.ts";
import type { ManifestBase } from "../types.d.ts";
import { createEffect } from "./effects.ts";

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
export const manifest = {
  /**
   * Sets the loader function used by `manifest/load`
   */
  setLoader: createEffect<ManifestOperations["setLoader"]>(
    "manifest/setLoader",
  ),
  /**
   * Reads the manifest.ts file and loads its content in memory
   */
  load: createEffect<ManifestOperations["load"]>("manifest/load"),
  /**
   * Returns the manifest object
   */
  get: createEffect<ManifestOperations["get"]>("manifest/get"),
  /**
   * Updates the manifest object in memory
   */
  update: createEffect<ManifestOperations["update"]>(
    "manifest/update",
  ),
  /**
   * Serializes the manifest object and saves it to disk
   */
  write: createEffect<ManifestOperations["write"]>("manifest/write"),
};
