import { hmr } from "$effects/hmr.ts";
import { manifest } from "$effects/manifest.ts";
import type { Manifest } from "$effects/render.ts";
import { filename } from "$lib/utils/path.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { assertObjectMatch } from "@std/assert";
import { extname } from "@std/path";
import { getFileKind } from "../utils/getFileKind.ts";
import { manifestShape } from "./manifest/mod.ts";

/**
 * @hooks
 * - `hmr/update`
 *
 * @performs
 * - `manifest/get`
 * - `manifest/update`
 */
export const handleHotUpdate = handlerFor(
  hmr.update,
  async ({ event, paths }) => {
    const extension = extname(event.path);
    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    if (!event.isFile || ![".html", ".js", ".ts"].includes(extension)) {
      return Handler.continue({ event, paths });
    }

    if (event.kind === "remove") {
      const fileKind = getFileKind(event.path);

      if (fileKind === "element") {
        const tagName = filename(event.path);
        const element = _manifest.elements[tagName];

        if (element) {
          if (element.files.length === 1) {
            delete _manifest.elements[tagName];
          } else {
            element.files = element.files.filter((f) =>
              extname(f) !== extension
            );

            switch (extension) {
              case ".html":
                break;
              case ".js":
              case ".ts":
                delete element.classLoader;
                break;
            }
          }
        }
      } else if (fileKind === "route") {
        const route = _manifest.routes[event.path];

        if (route) {
          delete _manifest.routes[event.path];
        }
      }
    } else if (event.kind === "create" || event.kind === "modify") {
      await manifest.updateEntries(event.path);
    }
    return Handler.continue({ event, paths });
  },
);
