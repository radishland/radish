import { emptyDirSync, ensureDirSync, type WalkEntry, walkSync } from "@std/fs";
import { basename, dirname, extname } from "@std/path";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
} from "../constants.ts";
import type { FileCache } from "../server/app.ts";
import type {
  BuildOptions,
  ManifestBase,
  Plugin,
  TransformContext,
} from "../types.d.ts";
import type { ImportMapController } from "./impormap.ts";

export class Builder {
  #plugins: Plugin[];
  // #options: BuildOptions;
  #manifest: ManifestBase;
  #importmapController: ImportMapController;
  #fileCache: FileCache;

  constructor(
    plugins: Plugin[],
    manifest: ManifestBase,
    importmapController: ImportMapController,
    fileCache: FileCache,
    options?: BuildOptions,
  ) {
    this.#plugins = plugins;
    // this.#options = options;
    this.#manifest = manifest;
    this.#importmapController = importmapController;
    this.#fileCache = fileCache;
  }

  #buildStart = (entries: WalkEntry[]) => {
    for (const plugin of this.#plugins) {
      if (plugin?.buildStart) {
        entries = plugin?.buildStart(entries, this.#manifest);
      }
    }

    return entries;
  };

  #processFile = async (path: string) => {
    let code = this.#fileCache.readTextFileSync(path);

    const context: TransformContext = {
      format: extname(path),
      manifest: this.#manifest,
      importmapController: this.#importmapController,
      fileCache: this.#fileCache,
    };

    for (const plugin of this.#plugins) {
      if (plugin?.transform) {
        const result = await plugin.transform(code, path, context);

        if (typeof result === "string") {
          code = result;
        } else if (result?.code) {
          code = result.code;

          context.ast = result.ast;
          context.meta = result.meta;
        }
      }
    }

    for (const plugin of this.#plugins) {
      const dest = plugin?.emit?.(path);

      if (dest) {
        ensureDirSync(dirname(dest));
        await Deno.writeTextFile(dest, code);
        break;
      }
    }
  };

  /**
   * Starts the build pipeline, calls the `buildStart` hooks to sort the entries, the `transform` hooks and the `emit` hooks
   */
  build = async (
    paths = [libFolder, elementsFolder, routesFolder],
    options = { emptyBuildFolder: true },
  ): Promise<void> => {
    console.log("Building...");

    if (options.emptyBuildFolder) {
      emptyDirSync(buildFolder);
    }

    const entries: WalkEntry[] = Array.from(
      new Set(
        paths.flatMap((path) => {
          if (extname(path)) {
            return [{
              isDirectory: false,
              isFile: true,
              isSymlink: false,
              path,
              name: basename(path),
            }];
          }
          return Array.from(
            walkSync(path, { includeDirs: true, includeFiles: true }),
          );
        }),
      ),
    );

    const sortedEntries = this.#buildStart(entries);

    for (const entry of sortedEntries) {
      if (entry.isFile) {
        await this.#processFile(entry.path);
      } else {
        for (const plugin of this.#plugins) {
          const dest = plugin?.emit?.(entry.path);
          if (dest) {
            ensureDirSync(dest);
            break;
          }
        }
      }
    }
  };
}
