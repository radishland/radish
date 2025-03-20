import { emptyDirSync, ensureDirSync, type WalkEntry, walkSync } from "@std/fs";
import { dirname, extname } from "@std/path";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
} from "../constants.ts";
import type {
  BuildOptions,
  ManifestBase,
  Plugin,
  TransformContext,
} from "../types.d.ts";
import { concatIterators } from "../utils.ts";

export class Builder {
  #plugins: Plugin[];
  // #options: BuildOptions;
  #manifest: ManifestBase;

  constructor(
    plugins: Plugin[],
    manifest: ManifestBase,
    options?: BuildOptions,
  ) {
    this.#plugins = plugins;
    // this.#options = options;
    this.#manifest = manifest;
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
    let code = Deno.readTextFileSync(path);

    const context: TransformContext = {
      format: extname(path),
      manifest: this.#manifest,
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
        Deno.writeTextFileSync(dest, code);
        break;
      }
    }
  };

  /**
   * Starts the build pipeline, indirectly calling the `buildStart` hooks to sort the entries, followed by the `transform` hooks and finally the `emit` hooks before writing to disk
   */
  build = async (
    paths = [libFolder, elementsFolder, routesFolder],
  ): Promise<void> => {
    console.log("Building...");

    emptyDirSync(buildFolder);

    const entries = Array.from(
      new Set(concatIterators(
        ...paths.map((folder) =>
          walkSync(folder, { includeDirs: true, includeFiles: true })
        ),
      )),
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
