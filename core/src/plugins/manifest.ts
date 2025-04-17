import { assertExists } from "@std/assert";
import { ensureDirSync, expandGlob, type WalkEntry } from "@std/fs";
import { extname } from "@std/path";
import {
  elementsFolder,
  generatedFolder,
  import_regex,
  libFolder,
  routesFolder,
} from "../constants.ts";
import type { ManifestBase, Plugin } from "../types.d.ts";
import { Option } from "../utils/algebraic-structures.ts";
import { stringifyObject } from "../utils/stringify.ts";
import { handlerFor, transformerFor } from "../effects/effects.ts";
import { manifest, manifestPath } from "../effects/manifest.ts";
import { io } from "../effects/io.ts";
import { hot } from "../effects/hot-update.ts";

let loader: (() => Promise<ManifestBase>) | undefined;

/**
 * Returns the deduped array of import aliases
 */
const extractImports = (source: string) => {
  return Array.from(
    new Set(source.matchAll(import_regex).map((match) => match[1] || match[2])),
  ).filter((str) => str !== undefined);
};

let manifestObject: ManifestBase = { imports: {} };

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
    transformerFor(hot.update, async ({ event }) => {
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
 * Performs the manifest/update effect on all entries of the path list
 *
 * @param paths A globs array
 */
export const updateManifest = async (
  paths: string[] = [
    `${libFolder}/**`,
    `${elementsFolder}/**`,
    `${routesFolder}/**`,
  ],
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
