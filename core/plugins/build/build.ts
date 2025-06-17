import { build } from "$effects/build.ts";
import { io } from "$effects/io.ts";
import { buildFolder } from "$lib/conventions.ts";
import { id } from "$lib/utils/algebraic-structures.ts";
import { expandGlobWorkspaceRelative } from "$lib/utils/fs.ts";
import { workspaceRelative } from "$lib/utils/path.ts";
import { Handler, handlerFor, type Plugin } from "@radish/effect-system";
import { distinctBy } from "@std/collections";
import { emptyDirSync, ensureDirSync, type WalkEntry } from "@std/fs";
import { join } from "@std/path";
import { buildHMRHook } from "./hooks/hmr.update.ts";

/**
 * @performs
 * - `io/read`
 * - `build/transform`
 * - `build/dest`
 * - `io/write`
 */
const handleBuildFile = handlerFor(build.file, async (path: string) => {
  const content = await io.read(path);
  const transformed = await build.transform(path, content);
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

const skipBuild = /\.(d|spec|test)\.(js|ts)$/;

/**
 * Skips test files and declaration files during the build
 */
const handleBuildSortFilterTestFiles = handlerFor(build.sort, (entries) => {
  entries = entries.filter((entry) =>
    entry.isFile && !skipBuild.test(entry.path)
  );

  return Handler.continue(entries);
});

/**
 * Base handler for the build/sort effect
 */
const handleBuildSortTerminal = handlerFor(build.sort, id);

/**
 * Canonically handles {@linkcode build.transform} as an identity transform
 */
export const handleBuildTransformTerminal = handlerFor(
  build.transform,
  (_, content) => content,
);

/**
 * Handles {@linkcode build.dest} effects
 */
export const handleBuildDest = handlerFor(
  build.dest,
  (path) => join(buildFolder, workspaceRelative(path)),
);

/**
 * The build plugin
 *
 * @hooks
 * - `hmr/update`
 *
 * @performs
 * - `io/read`
 * - `io/write`
 */
export const pluginBuild: Plugin = {
  name: "plugin-build",
  handlers: [
    handleBuildFile,
    handleBuildSortFilterTestFiles,
    handleBuildSortTerminal,
    handleBuildStart,
    handleBuildTransformTerminal,
    handleBuildDest,
    buildHMRHook,
  ],
};
