import { distinctBy } from "@std/collections";
import { emptyDirSync, ensureDirSync, type WalkEntry } from "@std/fs";
import { buildFolder } from "../constants.ts";
import { build } from "$effects/build.ts";
import { handlerFor } from "@radish/effect-system";
import { io } from "$effects/io.ts";
import type { Plugin } from "../types.d.ts";
import { expandGlobWorkspaceRelative } from "../utils/fs.ts";
import { id } from "../utils/algebraic-structures.ts";

/**
 * @performs
 * - `io/read`
 * - `build/transform`
 * - `build/dest`
 * - `io/write`
 */
const handleBuildFile = handlerFor(build.file, async (path: string) => {
  const content = await io.read(path);
  const { content: transformed } = await build.transform({
    path,
    content,
  });
  const dest = await build.dest(path);
  await io.write(dest, transformed);
});

/**
 * Starts the build pipeline, calls the `buildStart` hooks to sort the entries, the `transform` hooks and the `emit` hooks
 *
 * @param paths Array of globs
 * @param {boolean} options.incremental Whether the build folder should be kept or emptied
 *
 * @performs
 * - `build/file`
 * - `build/sort`
 * - `build/dest`
 */
const handleBuildStart = handlerFor(
  build.start,
  async (paths, options = { incremental: false }): Promise<void> => {
    console.log("Building...");

    if (!options.incremental) {
      emptyDirSync(buildFolder);
    }

    const entryArrays = await Promise.all(
      paths.map((p) => Array.fromAsync(expandGlobWorkspaceRelative(p))),
    );
    const entries: WalkEntry[] = entryArrays.flat();
    const uniqueEntries = distinctBy(entries, (entry) => entry.path);
    const sortedEntries = await build.sort(uniqueEntries);

    for (const entry of sortedEntries) {
      if (entry.isFile) {
        await build.file(entry.path);
      } else {
        const dest = await build.dest(entry.path);
        ensureDirSync(dest);
      }
    }
  },
);

/**
 * Base handler for the build/sort effect
 */
const handleBuildSort = handlerFor(build.sort, id);

/**
 * The build plugin
 *
 * @performs
 * - `io/read`
 * - `build/transform`
 * - `build/dest`
 * - `io/write`
 */
export const pluginBuild: Plugin = {
  name: "plugin-build",
  handlers: [handleBuildFile, handleBuildStart, handleBuildSort],
};
