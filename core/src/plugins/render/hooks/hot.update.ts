import { assertObjectMatch } from "@std/assert";
import { extname } from "@std/path";
import { elementsFolder, routesFolder } from "../../../constants.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { hot } from "$effects/hot-update.ts";
import { manifest } from "$effects/manifest.ts";
import type { Manifest } from "$effects/render.ts";
import { filename, isParent } from "../../../utils/path.ts";
import { manifestShape } from "./manifest.ts";
import { updateManifest } from "../../manifest/manifest.ts";

export const handleHotUpdate = handlerFor(
  hot.update,
  async ({ event, paths }) => {
    const extension = extname(event.path);
    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    if (!event.isFile || ![".html", ".js", ".ts"].includes(extension)) {
      return Handler.continue({ event, paths });
    }

    if (event.kind === "remove") {
      if (isParent(elementsFolder, event.path)) {
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
                delete element.templateLoader;
                break;
              case ".js":
              case ".ts":
                delete element.classLoader;
                break;
            }
          }
        }
      } else if (isParent(routesFolder, event.path)) {
        const route = _manifest.routes[event.path];

        if (route) {
          delete _manifest.routes[event.path];
        }
      }
    } else if (event.kind === "create" || event.kind === "modify") {
      await updateManifest(event.path);
    }
    return Handler.continue({ event, paths });
  },
);
