import { denoConfig } from "../effects/config.ts";
import { handlerFor } from "../effects/effects.ts";
import {
  type ImportMap,
  importmap,
  type ImportMapOptions,
  importmapPath,
  pureImportMap,
} from "../effects/impormap.ts";
import { io } from "../effects/io.ts";
import { manifest } from "../effects/manifest.ts";
import type { Plugin } from "../types.d.ts";

let importmapObject: ImportMap = {};

export const pluginImportmap: Plugin = {
  name: "plugin-importmap",
  handlers: [
    handlerFor(importmap.get, async () => {
      if (!importmapObject) {
        importmapObject = JSON.parse(
          await io.readFile(importmapPath),
        ) as ImportMap;
      }

      return importmapObject;
    }),

    handlerFor(importmap.write, async () => {
      await io.writeFile(importmapPath, JSON.stringify(importmapObject));
    }),
  ],
};

/**
 * Generates the importmap of based on the manifest.
 */
export const generateImportmap = async (
  options: ImportMapOptions = {},
): Promise<void> => {
  console.log("Generating importmap...");

  const config = await denoConfig.read();
  const manifestObject = await manifest.get();

  importmapObject = pureImportMap(
    manifestObject,
    config.imports ?? {},
    options,
  );
};
