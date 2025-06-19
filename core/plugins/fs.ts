import { hmr } from "$effects/hmr.ts";
import { fs } from "$effects/fs.ts";
import { workspaceRelative } from "$lib/utils/path.ts";
import { Handler, handlerFor, type Plugin } from "@radish/effect-system";
import { unimplemented } from "@std/assert";
import { ensureDir, exists, walk } from "@std/fs";
import { dirname, fromFileUrl } from "@std/path";

/**
 * A file store caching files content for efficient file access
 */
const fileCache = new Map<string, string>();

const onFSEnsureDir = handlerFor(fs.ensureDir, async (path) => {
  return await ensureDir(path);
});

const onFSExists = handlerFor(fs.exists, async (path) => {
  return await exists(path, { isReadable: true });
});

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
 * Handles {@linkcode fs.read} and returns the content of a local or remote file
 *
 * Caches the result of read operations for efficient file access
 *
 * Local paths are resolved relative to the project root for better caching.
 *
 * @param path The path to a local or remote file. Can be a relative or absolute path, or a URL
 *
 * @throws {AssertionError Unimplemented} If the the path URL is not on the `file:` or `https:` protocol
 */
export const onFSRead = handlerFor(fs.read, async (path) => {
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
onFSRead[Symbol.dispose] = () => {
  fileCache.clear();
};

/**
 * Handles {@linkcode fs.write} effects by writing string data to the given path, creating a new file if needed, else overwriting.
 *
 * Invalidates the file cache after a file write
 */
export const onFSWrite = handlerFor(
  fs.write,
  async (path, data) => {
    path = workspaceRelative(path);
    await fs.ensureDir(dirname(path));
    await Deno.writeTextFile(path, data);
    invalidateFileCache(path);
  },
);

/**
 * Handles {@linkcode fs.remove} effects by delegating to `Deno.remove`
 *
 * Invalidates the file cache
 */
export const onFSRemove = handlerFor(fs.remove, async (path) => {
  await Deno.remove(path, { recursive: true });

  invalidateFileCache(workspaceRelative(path));
});

const onFSWalk = handlerFor(fs.walk, async (root, options) => {
  return await Array.fromAsync(walk(root, options));
});

/**
 * The fs plugin
 *
 * @hooks
 * - `hmr/update`
 */
export const pluginFS: Plugin = {
  name: "plugin-fs",
  handlers: [
    onFSEnsureDir,
    onFSExists,
    onFSRead,
    onFSWrite,
    onFSRemove,
    onFSWalk,
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
};
