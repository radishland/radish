import { assertExists } from "@std/assert";
import { ensureDirSync, type ExpandGlobOptions } from "@std/fs";
import { extname } from "@std/path";
import { generatedFolder } from "../constants.ts";
import { handlerFor, transformerFor } from "../effects/effects.ts";
import { hot } from "../effects/hot-update.ts";
import { io } from "../effects/io.ts";
import { manifest, manifestPath } from "../effects/manifest.ts";
import type { ManifestBase, Plugin } from "../types.d.ts";
import { Option } from "../utils/algebraic-structures.ts";
import { expandGlobWorkspaceRelative } from "../utils/fs.ts";
import { stringifyObject } from "../utils/stringify.ts";
import { extractImports } from "../utils/parse.ts";

let loader: (() => Promise<ManifestBase>) | undefined;

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
          await updateManifest(event.path);
        }
      }
      return Option.none();
    }),
  ],
};

/**
 * Performs the manifest/update effect on all entries matching the glob
 */
export const updateManifest = async (
  glob: string | URL,
  options?: ExpandGlobOptions,
): Promise<void> => {
  for await (const entry of expandGlobWorkspaceRelative(glob, options)) {
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
