import { type } from "@radish/runtime/utils";
import { assertExists } from "@std/assert";
import { ensureDirSync, expandGlob, type WalkEntry } from "@std/fs";
import { join } from "@std/path";
import {
  elementsFolder,
  generatedFolder,
  libFolder,
  routesFolder,
} from "../constants.ts";
import { createEffect, createTransformEffect, handlerFor } from "./effects.ts";
import { SCOPE } from "../plugins.ts";
import type { ManifestBase } from "../types.d.ts";
import { io } from "./io.ts";

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
  update: createTransformEffect<ManifestOperations["update"]>(
    "manifest/update",
  ),
  /**
   * Serializes the manifest object and saves it to disk
   */
  write: createEffect<ManifestOperations["write"]>("manifest/write"),
};

let loader: (() => Promise<ManifestBase>) | undefined;

export const manifestHandlers = [
  handlerFor(manifest.setLoader, (manifestLoader) => {
    loader = manifestLoader;
  }),
  handlerFor(manifest.load, async () => {
    assertExists(
      loader,
      "Manifest loader used before it's defined. Use the manifest.setLoader effect",
    );
    manifestObject = await loader();
  }),
  handlerFor(manifest.get, () => manifestObject),
  handlerFor(manifest.write, async () => await writeManifest()),
];

/**
 * The path to the manifest file
 */
export const manifestPath: string = join(generatedFolder, "manifest.ts");

let manifestObject: ManifestBase = { imports: {} };

/**
 * Performs the manifest/update effect on all entries of the path list
 *
 * @param paths A globs array
 */
export const updateManifest = async (
  paths = [`${libFolder}/**`, `${elementsFolder}/**`, `${routesFolder}/**`],
): Promise<void> => {
  console.log("Generating manifest...");

  const entries: WalkEntry[] =
    (await Promise.all(paths.map((p) => Array.fromAsync(expandGlob(p)))))
      .flat();

  for (const entry of entries) {
    await manifest.update({ entry, manifestObject });
  }
};

/**
 * Stringifies the manifest object and saves it on disk
 *
 * Functions are stringified too, with their scope inlined from their `SCOPE` property
 */
const writeManifest = async () => {
  ensureDirSync(generatedFolder);

  let file = "export const manifest = ";
  file += stringifyObject(manifestObject);

  await io.writeFile(manifestPath, file);
};

const stringifyFunction = (fn: (...args: unknown[]) => unknown) => {
  let serialized = fn.toString();

  if (!Object.hasOwn(fn, SCOPE)) return serialized;

  const scope = Object.getOwnPropertyDescriptor(fn, SCOPE)?.value;

  for (const key of Object.keys(scope)) {
    const value = JSON.stringify(scope[key]);
    serialized = serialized.replaceAll(
      new RegExp(`\\b${key}\\b`, "g"),
      value,
    );
  }

  return serialized;
};

const stringifyArray = (arr: Array<any>) => {
  let str = "[";

  for (const v of arr) {
    if (["undefined", "boolean", "number"].includes(typeof v)) {
      str += `${v},`;
    } else if (typeof v === "string") {
      str += `${JSON.stringify(v)},`;
    } else if (v === null) {
      str += `null,`;
    } else if (typeof v === "object") {
      if (Array.isArray(v)) {
        str += `${stringifyArray(v)},`;
      } else {
        str += `${stringifyObject(v)},`;
      }
    } else if (typeof v === "function") {
      str += `${stringifyFunction(v)},`;
    }
  }

  str += "]";

  return str;
};

const stringifyObject = (obj: Record<string, any>) => {
  let str = "{";

  for (const [k, v] of Object.entries(obj)) {
    const key = /(^\d|\W)/.test(k) ? JSON.stringify(k) : k;
    switch (type(v)) {
      case "string":
        str += `${key}: ${JSON.stringify(v)},`;
        break;
      case "array":
        str += `${key}: ${stringifyArray(v)},`;
        break;
      case "function":
      case "AsyncFunction":
        str += `${key}: ${stringifyFunction(v)},`;
        break;
      case "object":
        str += `${key}: ${stringifyObject(v)},`;
        break;
      default:
        str += `${key}: ${v},`;
    }
  }

  str += "}";

  return str;
};
