import { assertExists } from "@std/assert";
import { ensureDirSync, type ExpandGlobOptions } from "@std/fs";
import { extname } from "@std/path";
import { generatedFolder } from "../constants.ts";
import { handlerFor } from "../effects/effects.ts";
import { hot } from "../effects/hot-update.ts";
import { io } from "../effects/io.ts";
import { manifest, manifestPath } from "../effects/manifest.ts";
import type { ManifestBase, Plugin } from "../types.d.ts";
import { expandGlobWorkspaceRelative } from "../utils/fs.ts";
import { extractImports } from "../utils/parse.ts";
import { stringifyObject } from "../utils/stringify.ts";
import { Handler } from "../effects/handlers.ts";

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
    handlerFor(manifest.write, writeManifest),
    /**
     * Extracts imports from .js & .ts files into the manifest for the importmap generation
     */
    handlerFor(manifest.update, async (
      { entry, manifestObject },
    ) => {
      if (entry.isFile && [".js", ".ts"].includes(extname(entry.path))) {
        const content = await io.readFile(entry.path);
        const imports = extractImports(content);
        manifestObject.imports[entry.path] = imports;
      }

      return { entry, manifestObject };
    }),
    handlerFor(hot.update, async ({ event, paths }) => {
      if (event.isFile) {
        const manifestObject = await manifest.get();
        const manifestImports = manifestObject.imports;

        if (event.kind === "remove") {
          delete manifestImports[event.path];
        } else if (event.kind === "modify") {
          await updateManifest(event.path);
        }
      }
      return Handler.continue({ event, paths });
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
    const result = await manifest.update({ entry, manifestObject });
    manifestObject = result.manifestObject;
  }
};

/**
 * Stringifies the manifest object and saves it on disk
 *
 * Functions are stringified with their scope by {@linkcode stringifyObject}
 */
async function writeManifest() {
  ensureDirSync(generatedFolder);

  let file = "export const manifest = ";
  file += stringifyObject(manifestObject);

  await io.writeFile(manifestPath, file);
}
