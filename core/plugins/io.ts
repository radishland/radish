import { hmr } from "$effects/hmr.ts";
import { io } from "$effects/io.ts";
import { workspaceRelative } from "$lib/utils/path.ts";
import { Handler, handlerFor, type Plugin } from "@radish/effect-system";
import { unimplemented } from "@std/assert";
import { ensureDir } from "@std/fs";
import { dirname, fromFileUrl } from "@std/path";

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

const readLocalTextFile = async (path: string) => {
  path = workspaceRelative(path);

  if (fileCache.has(path)) return fileCache.get(path)!;

  const content = await Deno.readTextFile(path);
  fileCache.set(path, content);
  return content;
};

/**
 * Handles {@linkcode io.read} and returns the content of a local or remote file
 *
 * Caches the result of read operations for efficient file access
 *
 * Local paths are resolved relative to the project root for better caching.
 *
 * @param path The path to a local or remote file. Can be a relative or absolute path, or a URL
 *
 * @throws {AssertionError Unimplemented} If the the path URL is not on the `file:` or `https:` protocol
 */
export const handleIORead = handlerFor(io.read, async (path) => {
  try {
    const url = new URL(path);

    switch (url.protocol) {
      case "file:":
        path = fromFileUrl(url);
        return readLocalTextFile(path);
      case "https:": {
        const res = await fetch(url);
        const content = await res.text();
        fileCache.set(path, content);
        return content;
      }

      default:
        unimplemented(
          " protocol. URL paths must be on the file: or https: protocol",
        );
    }
  } catch (error) {
    // not a url
    if (error instanceof TypeError) {
      return await readLocalTextFile(path);
    }
    throw error;
  }
});

/**
 * Handles {@linkcode io.write} effects
 *
 * Invalidates the file cache after a file write
 */
export const handleIOWrite = handlerFor(
  io.write,
  async (path, data) => {
    path = workspaceRelative(path);
    await ensureDir(dirname(path));
    await Deno.writeTextFile(path, data);
    invalidateFileCache(path);
  },
);

/**
 * The io plugin
 *
 * @hooks
 * - `hmr/update`
 */
export const pluginIO: Plugin = {
  name: "plugin-io",
  handlers: [
    handleIORead,
    handleIOWrite,
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
  ],
  onDispose: () => {
    fileCache.clear();
  },
};
