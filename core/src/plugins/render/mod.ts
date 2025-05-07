import { assertObjectMatch } from "@std/assert";
import { extname } from "@std/path";
import { elementsFolder, routesFolder } from "../../constants.ts";
import { handlerFor } from "../../effects/effects.ts";
import { Handler } from "../../effects/handlers.ts";
import { hot } from "../../effects/hot-update.ts";
import { manifest } from "../../effects/manifest.ts";
import type { Manifest } from "../../effects/render.ts";
import type { Plugin } from "../../types.d.ts";
import { filename, isParent } from "../../utils/path.ts";
import { updateManifest } from "../manifest.ts";
import { handleDirectives } from "./directives/mod.ts";
import { handleManifest, manifestShape } from "./hooks/manifest.ts";
import { handleRoutes } from "./routes/mod.ts";
import { handleSort } from "./hooks/sort.ts";
import { handleTransformNode } from "./transforms/mod.ts";
import { handleTransformFile } from "./hooks/transformFile.ts";
import { handleComponents } from "./components/component.ts";

export const pluginRender: Plugin = {
  name: "plugin-render",
  handlers: [
    handleSort,
    handleTransformFile,
    ...handleTransformNode,
    ...handleDirectives,
    ...handleManifest,
    handleComponents,
    ...handleRoutes,
    handlerFor(hot.update, async ({ event, paths }) => {
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
    }),
  ],
};
