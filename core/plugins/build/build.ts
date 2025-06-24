import { build, type BuildOptions } from "$effects/build.ts";
import { fs } from "$effects/fs.ts";
import { config } from "$effects/mod.ts";
import { buildFolder } from "$lib/conventions.ts";
import { id } from "$lib/utils/algebraic-structures.ts";
import { handlerFor, type Plugin } from "@radish/effect-system";
import { globToRegExp, join, relative } from "@std/path";
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
const onBuildFiles = handlerFor(
  build.files,
  async (glob, options): Promise<void> => {
    const optionsWithDefaults: Required<BuildOptions> = {
      root: Deno.cwd(),
      ...options,
    };

    const _config = await config.read();
    const skip = _config.build?.skip ?? [/(\.d|\.test|\.spec)\.ts$/];
    const allEntries = await fs.walk(optionsWithDefaults.root, {
      includeDirs: false,
      skip,
    });

    const match = globToRegExp(glob);
    const entries = allEntries.filter((e) =>
      relative(optionsWithDefaults.root, e.path).match(match)
    );

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
  (path) => join(buildFolder, relative(Deno.cwd(), path)),
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
    onBuildFiles,
    onBuildTransformTerminal,
    onBuildDest,
    buildHMRHook,
  ],
};
