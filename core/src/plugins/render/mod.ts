import { assertObjectMatch } from "@std/assert";
import { extname } from "@std/path";
import { elementsFolder, routesFolder } from "../../constants.ts";
import { handlerFor } from "../../effects/effects.ts";
import { Handler } from "../../effects/handlers.ts";
import { hot } from "../../effects/hot-update.ts";
import { io } from "../../effects/io.ts";
import { manifest } from "../../effects/manifest.ts";
import { type Manifest, render } from "../../effects/render.ts";
import type { Plugin } from "../../types.d.ts";
import { filename, isParent } from "../../utils/path.ts";
import { updateManifest } from "../manifest.ts";
import { handleDirectives } from "./directives/mod.ts";
import { handleManifest, manifestShape } from "./manifest.ts";
import { handleComponentsAndRoutes } from "./routes_and_components/mod.ts";
import { handleSort } from "./sort.ts";
import { assertEmptyHandlerRegistryStack, handleRenderState } from "./state.ts";
import { handleTransforms } from "./transform/mod.ts";

export const pluginRender: Plugin = {
  name: "plugin-render",
  handlers: [
    handleSort,
    ...handleTransforms,
    ...handleDirectives,
    ...handleRenderState,
    ...handleManifest,
    ...handleComponentsAndRoutes,
    handlerFor(io.transformFile, async ({ path, content }) => {
      if (extname(path) !== ".html") return Handler.continue({ path, content });

      const manifestObject = await manifest.get() as Manifest;
      assertObjectMatch(manifestObject, manifestShape);

      assertEmptyHandlerRegistryStack();

      if (isParent(elementsFolder, path)) {
        const tagName = filename(path);
        const element = manifestObject.elements[tagName];

        if (!element) return Handler.continue({ path, content });

        const rendered = await render.component(element);
        return Handler.continue({ path, content: rendered || content });
      }

      if (isParent(routesFolder, path)) {
        const route = manifestObject.routes[path];

        if (!route) return Handler.continue({ path, content });

        const rendered = await render.route(route, "", "");
        return Handler.continue({ path, content: rendered });
      }

      return Handler.continue({ path, content });
    }),
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
