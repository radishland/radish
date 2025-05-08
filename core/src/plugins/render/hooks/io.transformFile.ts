import { extname } from "@std/path";
import { Handler, handlerFor } from "@radish/effect-system";
import { io } from "$effects/io.ts";
import { type Manifest, render } from "$effects/render.ts";
import { manifest } from "$effects/manifest.ts";
import { manifestShape } from "./manifest.ts";
import { assertObjectMatch } from "@std/assert";
import { assertEmptyHandlerRegistryStack } from "../state.ts";
import { filename, isParent } from "../../../utils/path.ts";
import { elementsFolder, routesFolder } from "../../../constants.ts";

export const handleTransformFile = handlerFor(
  io.transformFile,
  async ({ path, content }) => {
    if (extname(path) !== ".html") return Handler.continue({ path, content });

    const manifestObject = await manifest.get() as Manifest;
    assertObjectMatch(manifestObject, manifestShape);

    assertEmptyHandlerRegistryStack();

    if (isParent(elementsFolder, path)) {
      const tagName = filename(path);
      const element = manifestObject.elements[tagName];

      if (!element?.templateLoader) return Handler.continue({ path, content });

      const rendered = await render.component(element);
      return Handler.continue({ path, content: rendered });
    }

    if (isParent(routesFolder, path)) {
      const route = manifestObject.routes[path];

      if (!route) return Handler.continue({ path, content });

      const rendered = await render.route(route, "", "");
      return Handler.continue({ path, content: rendered });
    }

    return Handler.continue({ path, content });
  },
);
