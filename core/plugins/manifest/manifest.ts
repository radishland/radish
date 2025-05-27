import { hmr } from "$effects/hmr.ts";
import { io } from "$effects/io.ts";
import { manifest, manifestPath } from "$effects/manifest.ts";
import { generatedFolder } from "$lib/constants.ts";
import type { ManifestBase } from "$lib/types.d.ts";
import { expandGlobWorkspaceRelative } from "$lib/utils/fs.ts";
import { extractImports } from "$lib/utils/parse.ts";
import { stringifyObject } from "$lib/utils/stringify.ts";
import { Handler, handlerFor, type Plugin } from "@radish/effect-system";
import { assertExists } from "@std/assert";
import { ensureDirSync, type ExpandGlobOptions } from "@std/fs";
import { extname } from "@std/path";

let loader: (() => Promise<ManifestBase>) | undefined;
let manifestObject: ManifestBase = { imports: {} };

const handleManifestSetLoader = handlerFor(
  manifest.setLoader,
  (manifestLoader) => {
    loader = manifestLoader;
  },
);
handleManifestSetLoader[Symbol.dispose] = () => {
  loader = undefined;
};

const handleManifestLoad = handlerFor(manifest.load, async () => {
  assertExists(
    loader,
    "Manifest loader used before it's defined. Use the manifest.setLoader effect",
  );
  manifestObject = await loader();
});
handleManifestLoad[Symbol.dispose] = () => {
  manifestObject = { imports: {} };
};

const handleManifestUpdate = handlerFor(manifest.update, async (
  { entry, manifestObject },
) => {
  if (entry.isFile && [".js", ".ts"].includes(extname(entry.path))) {
    const content = await io.read(entry.path);
    const imports = extractImports(content);
    manifestObject.imports[entry.path] = imports;
  }

  return { entry, manifestObject };
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
    handleManifestSetLoader,
    handleManifestLoad,
    handlerFor(manifest.get, () => manifestObject),
    handlerFor(manifest.write, writeManifest),
    /**
     * Extracts imports from .js & .ts files into the manifest for the importmap generation
     */
    handleManifestUpdate,
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

  await io.write(manifestPath, file);
}
