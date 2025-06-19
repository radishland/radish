import { fs } from "$effects/fs.ts";
import { hmr } from "$effects/hmr.ts";
import { manifest, manifestPath } from "$effects/manifest.ts";
import type { ManifestBase } from "$lib/types.d.ts";
import { expandGlobWorkspaceRelative } from "$lib/utils/fs.ts";
import { extractImports } from "$lib/utils/parse.ts";
import { stringifyObject } from "$lib/utils/stringify.ts";
import { Handler, handlerFor, type Plugin } from "@radish/effect-system";
import type { ExpandGlobOptions } from "@std/fs";
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
 * - fs/read
 */
export const handleManifestUpdateExtractImports = handlerFor(
  manifest.update,
  async (entry) => {
    if (entry.isFile && [".js", ".ts"].includes(extname(entry.path))) {
      const manifestObject = await manifest.get();
      const content = await fs.read(entry.path);
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
 * - `fs.write`
 */
const handleManifestWrite = handlerFor(manifest.write, async () => {
  let file = "export const manifest = ";
  file += stringifyObject(manifestObject);

  await fs.write(manifestPath, file);
});

/**
 * @hooks
 * - `hmr/update`
 *
 * @performs
 * - `fs/read`
 * - `fs/write`
 */
export const pluginManifest: Plugin = {
  name: "plugin-manifest",
  handlers: [
    handleManifestSet,
    handleManifestGet,
    handleManifestWrite,
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
 * Do not insert test files or declaration files in the manifest
 */
export const skipManifest = /\.(d|spec|test)\.(js|ts)$/;

/**
 * Performs the manifest/update effect on all entries matching the glob
 */
export const updateManifest = async (
  glob: string | URL,
  options?: ExpandGlobOptions,
): Promise<void> => {
  for await (const entry of expandGlobWorkspaceRelative(glob, options)) {
    if (!skipManifest.test(entry.path)) {
      await manifest.update(entry);
    }
  }
};
