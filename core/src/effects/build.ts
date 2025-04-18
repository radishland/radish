import { emptyDirSync, ensureDirSync, type WalkEntry } from "@std/fs";
import { distinctBy } from "@std/collections";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
} from "../constants.ts";
import { expandGlobWorkspaceRelative } from "../utils/fs.ts";
import { createTransformEffect } from "./effects.ts";
import { io } from "./io.ts";

export const buildPipeline = {
  sortFiles: createTransformEffect<(entries: WalkEntry[]) => WalkEntry[]>(
    "build/sort",
  ),
};

export const processFile = async (path: string) => {
  const content = await io.readFile(path);
  const { content: transformed } = await io.transformFile({ path, content });
  const dest = await io.emitTo(path);
  await io.writeFile(dest, transformed);
};

/**
 * Starts the build pipeline, calls the `buildStart` hooks to sort the entries, the `transform` hooks and the `emit` hooks
 *
 * @param paths Array of globs
 * @param {boolean} options.incremental Whether the build folder should be kept or emptied
 */
export const build = async (
  paths = [`${libFolder}/**`, `${elementsFolder}/**`, `${routesFolder}/**`],
  options = { incremental: false },
): Promise<void> => {
  console.log("Building...");

  if (!options.incremental) {
    emptyDirSync(buildFolder);
  }

  const entries: WalkEntry[] = (await Promise.all(
    paths.map(async (p) =>
      await Array.fromAsync(expandGlobWorkspaceRelative(p))
    ),
  )).flat();
  const uniqueEntries = distinctBy(entries, (entry) => entry.path);
  const sortedEntries = await buildPipeline.sortFiles(uniqueEntries);

  for (const entry of sortedEntries) {
    if (entry.isFile) {
      await processFile(entry.path);
    } else {
      const dest = await io.emitTo(entry.path);
      ensureDirSync(dest);
    }
  }
};
