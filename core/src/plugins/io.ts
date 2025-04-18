import { ensureDir } from "@std/fs";
import { dirname, join, relative } from "@std/path";
import { buildFolder } from "../constants.ts";
import type { Plugin } from "../types.d.ts";
import { handlerFor, transformerFor } from "../effects/effects.ts";
import { hot } from "../effects/hot-update.ts";
import { io } from "../effects/io.ts";
import { Option } from "../utils/algebraic-structures.ts";
import { throwUnlessNotFound } from "../utils/io.ts";
import { workspaceRelative } from "../utils/path.ts";

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
 * Caches the result of read operations for efficient file access
 */
export const pluginIO: Plugin = {
  name: "io-handlers",
  handlers: [
    handlerFor(io.readFile, async (path) => {
      path = workspaceRelative(path);

      if (fileCache.has(path)) return fileCache.get(path)!;

      const content = await Deno.readTextFile(path);
      fileCache.set(path, content);
      return content;
    }),
    handlerFor(io.emitTo, (path) => join(buildFolder, workspaceRelative(path))),
    handlerFor(io.writeFile, async (path, data) => {
      path = workspaceRelative(path);
      await ensureDir(dirname(path));
      await Deno.writeTextFile(path, data);
      invalidateFileCache(path);
    }),
  ],
  transformers: [
    /**
     * Invalidates the file cache when a file is modified or removed
     */
    transformerFor(hot.update, ({ event, paths }) => {
      if (
        event.isFile &&
        (event.kind === "modify" || event.kind === "remove")
      ) {
        invalidateFileCache(event.path);

        if (event.kind === "modify" && !paths.includes(event.path)) {
          paths.push(event.path);
        }

        return Option.some({ event, paths });
      }
      return Option.none();
    }),
    /**
     * Updates files inside the build folder in a way that mirrors the source folder structure
     */
    transformerFor(hot.update, async ({ event, paths }) => {
      if (event.kind === "remove") {
        try {
          const target = await io.emitTo(event.path);
          await Deno.remove(target, { recursive: !event.isFile });
          console.log(`removed`, event.path);

          // don't process files under the removed path
          paths = paths.filter((f) => relative(event.path, f).startsWith(".."));

          return Option.some({ event, paths });
        } catch (error) {
          throwUnlessNotFound(error);
        }
      }
      return Option.none();
    }),
  ],
};
