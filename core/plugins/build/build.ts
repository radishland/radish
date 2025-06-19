import { build } from "$effects/build.ts";
import { fs } from "$effects/fs.ts";
import { config } from "$effects/mod.ts";
import { buildFolder } from "$lib/conventions.ts";
import { id } from "$lib/utils/algebraic-structures.ts";
import { workspaceRelative } from "$lib/utils/path.ts";
import { handlerFor, type Plugin } from "@radish/effect-system";
import { globToRegExp, join } from "@std/path";
import { buildHMRHook } from "./hooks/hmr.update.ts";

/**
 * @performs
 * - `fs/read`
 * - `build/transform`
 * - `build/dest`
 * - `fs/write`
 */
const onBuildFile = handlerFor(build.file, async (path: string) => {
  const content = await fs.read(path);
  const transformed = await build.transform(path, content);
  const dest = await build.dest(path);
  await fs.write(dest, transformed);
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
 * - `config/read`
 * - `fs/exists`
 * - `fs/remove`
 * - `fs/walk`
 */
const onBuildStart = handlerFor(
  build.files,
  async (glob, options = { incremental: false }): Promise<void> => {
    console.log("Building...");

    if (!options.incremental) {
      if (await fs.exists(buildFolder)) {
        await fs.remove(buildFolder);
      }
    }

    const match = globToRegExp(glob);

    const entries = await fs.walk(Deno.cwd(), {
      match: [new RegExp(match.source.slice(1))],
      includeDirs: false,
      skip: (await config.read()).build?.skip ?? [/(\.test|\.spec)\.ts$/],
    });

    const sortedEntries = await build.sort(entries);

    for (const entry of sortedEntries) {
      await build.file(entry.path);
    }
  },
);

/**
 * Base handler for the build/sort effect
 */
const onBuildSortTerminal = handlerFor(build.sort, id);

/**
 * Canonically handles {@linkcode build.transform} as an identity transform
 */
export const onBuildTransformTerminal = handlerFor(
  build.transform,
  (_, content) => content,
);

/**
 * Handles {@linkcode build.dest} effects
 */
export const onBuildDest = handlerFor(
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
 * - `config/read`
 * - `fs/exists`
 * - `fs/read`
 * - `fs/remove`
 * - `fs/walk`
 * - `fs/write`
 */
export const pluginBuild: Plugin = {
  name: "plugin-build",
  handlers: [
    onBuildFile,
    onBuildSortTerminal,
    onBuildStart,
    onBuildTransformTerminal,
    onBuildDest,
    buildHMRHook,
  ],
};
