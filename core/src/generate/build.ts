import { emptyDirSync, ensureDirSync, walkSync } from "@std/fs";
import { dirname, extname } from "@std/path";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
} from "../constants.ts";
import {
  pluginDefaultEmit,
  pluginStripTypes,
  pluginTransformElements,
  pluginTransformRoutes,
} from "../plugins.ts";
import type {
  BuildOptions,
  RadishPlugin,
  TransformContext,
} from "../types.d.ts";
import type { Manifest } from "./manifest.ts";
import { manifest, sortComponents } from "./manifest.ts";

class Builder {
  #plugins: RadishPlugin[];
  #options: BuildOptions;
  #manifest: Manifest;

  constructor(
    plugins: RadishPlugin[],
    options: BuildOptions,
    manifest: Manifest,
  ) {
    this.#plugins = plugins;
    this.#options = options;
    this.#manifest = manifest;

    this.buildStart();
  }

  buildStart = () => {
    emptyDirSync(buildFolder);

    for (const plugin of this.#plugins) {
      if (plugin.buildStart) {
        plugin.buildStart(this.#options);
      }
    }
  };

  processFile = (path: string) => {
    let code = Deno.readTextFileSync(path);
    const context: TransformContext = {
      format: extname(path),
      manifest: this.#manifest,
    };

    for (const plugin of this.#plugins) {
      if (plugin?.transform) {
        const result = plugin.transform(code, path, context);

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
}

/**
 * Runs the build process
 */
export const build = (
  manifestObject: Manifest,
  options?: BuildOptions,
): void => {
  console.log("Building...");

  manifest.elements = manifestObject.elements;
  manifest.routes = manifestObject.routes;

  const sorted = sortComponents([
    ...Object.values(manifest.elements),
    ...Object.values(manifest.routes),
  ]);

  const paths = sorted
    .map((c) => c.files.find((f) => f.endsWith(".html")))
    .filter((path) => path !== undefined);

  const builder = new Builder(
    [
      pluginTransformRoutes(),
      pluginTransformElements,
      pluginStripTypes,
      pluginDefaultEmit,
    ],
    options ?? {},
    manifestObject,
  );

  const folders = [libFolder, elementsFolder, routesFolder];

  for (const folder of folders) {
    for (
      const entry of walkSync(folder, {
        includeFiles: true,
        includeDirs: false,
      })
    ) {
      if (paths.includes(entry.path)) continue;

      builder.processFile(entry.path);
    }
  }

  for (const path of paths) {
    builder.processFile(path);
  }
};
