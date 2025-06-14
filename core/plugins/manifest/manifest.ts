import { hmr } from "$effects/hmr.ts";
import { io } from "$effects/io.ts";
import { manifest, manifestPath } from "$effects/manifest.ts";
import { generatedFolder } from "$lib/conventions.ts";
import type { ManifestBase } from "$lib/types.d.ts";
import { expandGlobWorkspaceRelative } from "$lib/utils/fs.ts";
import { extractImports } from "$lib/utils/parse.ts";
import { stringifyObject } from "$lib/utils/stringify.ts";
import { Handler, handlerFor, type Plugin } from "@radish/effect-system";
import { ensureDirSync, type ExpandGlobOptions } from "@std/fs";
import { extname } from "@std/path";

let manifestObject: ManifestBase = {
  imports: {},
};

/**
 * Sets the in-memory manifest object to a given value
 *
 * @hooks
 * - `manifest/set`
 */
export const handleManifestSet = handlerFor(manifest.set, (_manifestObject) => {
  manifestObject = _manifestObject;
});
handleManifestSet[Symbol.dispose] = () => {
  manifestObject = { imports: {} };
};

/**
 * Returns the manifest object
 *
 * @hooks
 * - `manifest/get`
 */
export const handleManifestGet = handlerFor(manifest.get, () => manifestObject);

/**
 * Updates the manifest file by extracting imports from .js or .ts files
 *
 * @hooks
 * - manifest/update
 *
 * @performs
 * - io/read
 */
export const handleManifestUpdateExtractImports = handlerFor(
  manifest.update,
  async (entry) => {
    if (entry.isFile && [".js", ".ts"].includes(extname(entry.path))) {
      const manifestObject = await manifest.get();
      const content = await io.read(entry.path);
      const imports = extractImports(content);
      manifestObject.imports[entry.path] = imports;
    }
    return Handler.continue(entry);
  },
);

/**
 * Terminal `manifest/update` handler
 */
export const handleManifestUpdateTerminal = handlerFor(
  manifest.update,
  () => {},
);

/**
 * Stringifies the manifest object and saves it on disk
 *
 * Functions are stringified with their scope by {@linkcode stringifyObject}
 *
 * @hooks
 * - `manifest/write`
 *
 * @performs
 * - `io.write`
 */
const handleManifestWrite = handlerFor(manifest.write, async () => {
  ensureDirSync(generatedFolder);

  let file = "export const manifest = ";
  file += stringifyObject(manifestObject);

  await io.write(manifestPath, file);
});

/**
 * @hooks
 * - `hmr/update`
 *
 * @performs
 * - `io/read`
 * - `io/write`
 */
export const pluginManifest: Plugin = {
  name: "plugin-manifest",
  handlers: [
    handleManifestSet,
    handleManifestGet,
    handleManifestWrite,
    /**
     * Extracts imports from .js & .ts files into the manifest for the importmap generation
     */
    handleManifestUpdateExtractImports,
    handleManifestUpdateTerminal,
    handlerFor(hmr.update, async ({ event, paths }) => {
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
    await manifest.update(entry);
  }
};
