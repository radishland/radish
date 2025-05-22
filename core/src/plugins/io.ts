import { hmr } from "$effects/hmr.ts";
import { io } from "$effects/io.ts";
import { buildFolder } from "$lib/constants.ts";
import type { Plugin } from "$lib/types.d.ts";
import { id } from "$lib/utils/algebraic-structures.ts";
import { throwUnlessNotFound } from "$lib/utils/io.ts";
import { isParent, workspaceRelative } from "$lib/utils/path.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { ensureDir } from "@std/fs";
import { dirname, join } from "@std/path";
import { build } from "$effects/mod.ts";

/**
 * A file store caching `Deno.readTextFile` calls for efficient file access
 */
const fileCache = new Map<string, string>();

/**
 * Removes a file from the cache
 */
const invalidateFileCache = (path: string): boolean => {
  path = workspaceRelative(path);
  return fileCache.delete(path);
};

/**
 * Handles {@linkcode io.read} effects
 *
 * Caches the result of read operations for efficient file access
 */
export const IOReadFileHandler = handlerFor(io.read, async (path) => {
  path = workspaceRelative(path);

  if (fileCache.has(path)) return fileCache.get(path)!;

  const content = await Deno.readTextFile(path);
  fileCache.set(path, content);
  return content;
});

/**
 * Handles {@linkcode build.dest} effects
 */
export const IOEmitToHandler = handlerFor(
  build.dest,
  (path) => join(buildFolder, workspaceRelative(path)),
);

/**
 * Handles {@linkcode io.write} effects
 *
 * Invalidates the file cache after a file write
 */
export const IOWriteFileHandler = handlerFor(
  io.write,
  async (path, data) => {
    path = workspaceRelative(path);
    await ensureDir(dirname(path));
    await Deno.writeTextFile(path, data);
    invalidateFileCache(path);
  },
);

/**
 * Canonically handles {@linkcode build.transform} effects as an identity transform
 */
export const IOTransformHandler = handlerFor(build.transform, id);

/**
 * The io plugin
 *
 * @hooks
 * - `hmr/update`
 */
export const pluginIO: Plugin = {
  name: "plugin-io",
  handlers: [
    IOReadFileHandler,
    IOEmitToHandler,
    IOWriteFileHandler,
    IOTransformHandler,
    /**
     * Invalidates the file cache when a file is modified or removed
     */
    handlerFor(hmr.update, ({ event, paths }) => {
      if (
        event.isFile &&
        (event.kind === "modify" || event.kind === "remove")
      ) {
        invalidateFileCache(event.path);

        if (event.kind === "modify" && !paths.includes(event.path)) {
          paths.push(event.path);
        }

        return Handler.continue({ event, paths });
      }

      return Handler.continue({ event, paths });
    }),
    /**
     * Updates files inside the build folder in a way that mirrors the source folder structure
     */
    handlerFor(hmr.update, async ({ event, paths }) => {
      if (event.kind === "remove") {
        try {
          const target = await build.dest(event.path);
          await Deno.remove(target, { recursive: !event.isFile });
          console.log(`removed`, event.path);

          // don't process files under the removed path
          paths = paths.filter((f) => isParent(event.path, f));

          return Handler.continue({ event, paths });
        } catch (error) {
          throwUnlessNotFound(error);
        }
      }
      return Handler.continue({ event, paths });
    }),
  ],
};
