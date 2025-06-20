import { fs } from "$effects/fs.ts";
import { hmr } from "$effects/hmr.ts";
import {
  manifest,
  manifestPath,
  type ManifestUpdateOptions,
} from "$effects/manifest.ts";
import { config } from "$effects/mod.ts";
import type { ManifestBase } from "$lib/types.d.ts";
import { stringifyObject } from "$lib/utils/stringify.ts";
import { Handler, handlerFor, type Plugin } from "@radish/effect-system";
import { extname, globToRegExp, relative } from "@std/path";

let manifestObject: ManifestBase = {
  imports: {},
};

/**
 * Sets the in-memory manifest object to a given value
 *
 * @hooks
 * - `manifest/set`
 */
export const onManifestSet = handlerFor(manifest.set, (_manifestObject) => {
  manifestObject = _manifestObject;
});
onManifestSet[Symbol.dispose] = () => {
  manifestObject = { imports: {} };
};

/**
 * Returns the manifest object
 *
 * @hooks
 * - `manifest/get`
 */
export const onManifestGet = handlerFor(manifest.get, () => manifestObject);

/**
 * Updates the manifest file by extracting imports from .js or .ts files
 *
 * @hooks
 * - `manifest/update-entry`
 *
 * @performs
 * - `fs/read`
 * - `manifest/get`
 */
export const onManifestUpdateExtractImports = handlerFor(
  manifest.updateEntry,
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
export const onManifestUpdateTerminal = handlerFor(
  manifest.updateEntry,
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
const onManifestWrite = handlerFor(manifest.write, async () => {
  let file = "export const manifest = ";
  file += stringifyObject(manifestObject);

  await fs.write(manifestPath, file);
});

/**
 * Performs the manifest/update-entries effect on all entries matching the glob
 *
 * @hooks
 * - `manifest/update-entries`
 *
 * @performs
 * - `config/read`
 * - `fs/walk`
 * - `manifest/update-entry`
 */
export const onManifestUpdateEntries = handlerFor(
  manifest.updateEntries,
  async (glob: string, options): Promise<void> => {
    const optionsWithDefaults: Required<ManifestUpdateOptions> = {
      root: Deno.cwd(),
      ...options,
    };

    const allEntries = await fs.walk(optionsWithDefaults.root, {
      includeDirs: false,
      skip: (await config.read()).manifest?.skip ?? [/(\.test|\.spec)\.ts$/],
    });

    // Not using the `match` option from `walk` as `globToRegExp` returns a RegExp matching from start to end like /^elements...$/
    // Slicing it is also wrong as it would match against subfolders like build/elements...
    const match = globToRegExp(glob);
    const entries = allEntries.filter((e) =>
      relative(optionsWithDefaults.root, e.path).match(match)
    );

    for (const entry of entries) {
      await manifest.updateEntry(entry);
    }
  },
);

/**
 * @hooks
 * - `hmr/update`
 *
 * @performs
 * - `config/read`
 * - `fs/read`
 * - `fs/write`
 * - `fs/walk`
 */
export const pluginManifest: Plugin = {
  name: "plugin-manifest",
  handlers: [
    onManifestSet,
    onManifestGet,
    onManifestWrite,
    onManifestUpdateExtractImports,
    onManifestUpdateTerminal,
    onManifestUpdateEntries,
    handlerFor(hmr.update, async ({ event, paths }) => {
      if (event.isFile) {
        const manifestObject = await manifest.get();
        const manifestImports = manifestObject.imports;

        if (event.kind === "remove") {
          delete manifestImports[event.path];
        } else if (event.kind === "modify") {
          await manifest.updateEntries(event.path);
        }
      }
      return Handler.continue({ event, paths });
    }),
  ],
};

/**
 * Extracts import specifiers from import declarations or dynamic imports
 */
export const import_regex =
  /from\s["']([^'"]+)["']|import\(["']([^"']+)["']\)/g;

/**
 * Returns the deduped array of (maybe dynamic) import specifiers from a js/ts
 * source file
 */
export function extractImports(source: string) {
  return Array.from(
    new Set(source.matchAll(import_regex).map((match) => match[1] || match[2])),
  ).filter((str) => str !== undefined);
}
