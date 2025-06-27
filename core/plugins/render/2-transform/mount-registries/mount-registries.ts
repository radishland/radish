import { manifest } from "$effects/manifest.ts";
import { type Manifest, render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { isElementNode, isMNode } from "@radish/htmlcrunch";
import { assertObjectMatch } from "@std/assert";
import { filename } from "../../../../utils/path.ts";
import { manifestShape } from "../../hooks/manifest/mod.ts";
import { HANDLER_INSTANCE } from "../../utils/contextLookup.ts";
import { getFileKind } from "../../utils/getFileKind.ts";

/**
 * Instantiates handler registries
 *
 * should happen first
 */
export const onRenderTransformNodeMountRegistries = handlerFor(
  render.transformNode,
  async (path, node) => {
    if (!isMNode(node)) return Handler.continue(path, node);
    if (!isElementNode(node)) return Handler.continue(path, node);

    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    let { tagName } = node;

    // The root template of an element node is instanciated
    if (
      tagName === "template" && node.parent === undefined &&
      getFileKind(path) === "element"
    ) {
      tagName = filename(path);
    }

    const element = _manifest.elements[tagName];
    if (element?.classLoader) {
      const ElementClass = await element.classLoader();
      const instance = new ElementClass();

      Object.defineProperty(node, HANDLER_INSTANCE, {
        enumerable: true,
        value: instance,
      });
    }

    return Handler.continue(path, node);
  },
);
