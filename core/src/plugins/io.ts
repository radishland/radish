import { ensureDir } from "@std/fs";
import { dirname, join } from "@std/path";
import { buildFolder } from "../constants.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { hot } from "$effects/hot-update.ts";
import { io } from "$effects/io.ts";
import type { Plugin } from "../types.d.ts";
import { throwUnlessNotFound } from "../utils/io.ts";
import { isParent, workspaceRelative } from "../utils/path.ts";
import { id } from "../utils/algebraic-structures.ts";

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
 * Handles {@linkcode io.readFile} effects
 *
 * Caches the result of read operations for efficient file access
 */
export const IOReadFileHandler = handlerFor(io.readFile, async (path) => {
  path = workspaceRelative(path);

  if (fileCache.has(path)) return fileCache.get(path)!;

  const content = await Deno.readTextFile(path);
  fileCache.set(path, content);
  return content;
});

/**
 * Handles {@linkcode io.emitTo} effects
 */
export const IOEmitToHandler = handlerFor(
  io.emitTo,
  (path) => join(buildFolder, workspaceRelative(path)),
);

/**
 * Handles {@linkcode io.writeFile} effects
 *
 * Invalidates the file cache after a file write
 */
export const IOWriteFileHandler = handlerFor(
  io.writeFile,
  async (path, data) => {
    path = workspaceRelative(path);
    await ensureDir(dirname(path));
    await Deno.writeTextFile(path, data);
    invalidateFileCache(path);
  },
);

/**
 * Canonically handles {@linkcode io.transformFile} effects as an identity transform
 */
export const IOTransformHandler = handlerFor(io.transformFile, id);

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
    handlerFor(hot.update, ({ event, paths }) => {
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
    handlerFor(hot.update, async ({ event, paths }) => {
      if (event.kind === "remove") {
        try {
          const target = await io.emitTo(event.path);
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
