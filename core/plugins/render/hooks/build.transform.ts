import { manifest } from "$effects/manifest.ts";
import { build } from "$effects/mod.ts";
import { type Manifest, render } from "$effects/render.ts";
import { elementsFolder, routesFolder } from "$lib/conventions.ts";
import { filename, isParent } from "$lib/utils/path.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { assertObjectMatch } from "@std/assert";
import { extname } from "@std/path";
import { assertEmptyHandlerRegistryStack } from "../state.ts";
import { manifestShape } from "./manifest/mod.ts";

/**
 * @hooks
 * - `build/transform`
 *
 * @performs
 * - `manifest/get`
 * - `render/component`
 * - `render/route`
 */
export const handleTransformFile = handlerFor(
  build.transform,
  async (path, content) => {
    if (extname(path) !== ".html") return Handler.continue(path, content);

    const manifestObject = await manifest.get() as Manifest;
    assertObjectMatch(manifestObject, manifestShape);

    assertEmptyHandlerRegistryStack();

    if (isParent(elementsFolder, path)) {
      const tagName = filename(path);
      const element = manifestObject.elements[tagName];

      if (!element?.templatePath) return Handler.continue(path, content);

      const rendered = await render.component(element);
      return Handler.continue(path, rendered);
    }

    if (isParent(routesFolder, path)) {
      const route = manifestObject.routes[path];

      if (!route) return Handler.continue(path, content);

      const rendered = await render.route(route, "", "");
      return Handler.continue(path, rendered);
    }

    return Handler.continue(path, content);
  },
);
