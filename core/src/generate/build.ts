import {
  emptyDirSync,
  ensureDirSync,
  type WalkOptions,
  walkSync,
} from "@std/fs";
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
import { sortComponents } from "./manifest.ts";
import type { Manifest } from "../plugins.ts";

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

  #buildStart = () => {
    emptyDirSync(buildFolder);
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

  #processFolder = async (
    path: string,
    options?: WalkOptions,
  ) => {
    for (
      const entry of walkSync(path, {
        includeFiles: true,
        includeDirs: true,
        ...options,
      })
    ) {
      if (entry.isDirectory) {
        for (const plugin of this.#plugins) {
          const dest = plugin?.emit?.(path);
          if (dest) {
            ensureDirSync(dest);
            break;
          }
        }
      } else {
        await this.#processFile(entry.path);
      }
    }
  };

  process = async (path: string): Promise<void> => {
    if (extname(path)) {
      await this.#processFile(path);
    } else {
      await this.#processFolder(path);
    }
  };

  /**
   * Starts the build pipeline
   */
  build = async (): Promise<void> => {
    console.log("Building...");

    this.#buildStart();

    const sorted = sortComponents([
      ...Object.values((this.#manifest as Manifest).elements),
      ...Object.values((this.#manifest as Manifest).routes),
    ]);

    const paths = sorted
      .map((c) => c.files.find((f) => f.endsWith(".html")))
      .filter((path) => path !== undefined);

    const folders = [libFolder, elementsFolder, routesFolder];

    for (const folder of folders) {
      this.#processFolder(folder, { skip: paths.map((p) => new RegExp(p)) });
    }

    for (const path of paths) {
      await this.#processFile(path);
    }
  };
}
