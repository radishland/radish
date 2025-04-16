import { assertExists } from "@std/assert";
import { ensureDirSync, expandGlob, type WalkEntry } from "@std/fs";
import { extname } from "@std/path";
import {
  elementsFolder,
  generatedFolder,
  import_regex,
  libFolder,
  manifestPath,
  routesFolder,
} from "../constants.ts";
import type { ManifestBase, Plugin } from "../types.d.ts";
import { Option } from "../utils/algebraic-structures.ts";
import {
  createEffect,
  createTransformEffect,
  handlerFor,
  transformerFor,
} from "./effects.ts";
import { hotUpdate } from "./hot-update.ts";
import { io } from "./io.ts";
import { stringifyObject } from "../utils/stringify.ts";

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

export const pluginManifest: Plugin = {
  name: "plugin-manifest",
  handlers: [
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
  ],
  transformers: [
    /**
     * Extracts imports from .js & .ts files into the manifest for the importmap generation
     */
    transformerFor(manifest.update, async (
      { entry, manifestObject },
    ) => {
      if (!entry.isFile || ![".js", ".ts"].includes(extname(entry.path))) {
        return Option.none();
      }

      const content = await io.readFile(entry.path);
      const imports = extractImports(content);
      manifestObject.imports[entry.path] = imports;

      return Option.some({ entry, manifestObject });
    }),
    transformerFor(hotUpdate, async ({ event }) => {
      if (event.isFile) {
        const manifestObject = await manifest.get();
        const manifestImports = manifestObject.imports;

        if (event.kind === "remove") {
          delete manifestImports[event.path];
        } else if (event.kind === "modify") {
          await updateManifest([event.path]);
        }
      }
      return Option.none();
    }),
  ],
};

/**
 * Returns the deduped array of import aliases
 */
const extractImports = (source: string) => {
  return Array.from(
    new Set(source.matchAll(import_regex).map((match) => match[1] || match[2])),
  ).filter((str) => str !== undefined);
};

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
 * Functions are stringified with their scope by {@linkcode stringifyObject}
 */
const writeManifest = async () => {
  ensureDirSync(generatedFolder);

  let file = "export const manifest = ";
  file += stringifyObject(manifestObject);

  await io.writeFile(manifestPath, file);
};
