import { manifest } from "$effects/manifest.ts";
import { type Manifest, render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { isElementNode, isMNode } from "@radish/htmlcrunch";
import { assertObjectMatch } from "@std/assert";
import { manifestShape } from "../../hooks/manifest/mod.ts";
import { HANDLER_INSTANCE } from "../../utils/contextLookup.ts";

/**
 * Instantiates handler registries
 *
 * should happen first
 */
export const onRenderTransformNodeMountRegistries = handlerFor(
  render.transformNode,
  async (node) => {
    if (!isMNode(node)) return Handler.continue(node);
    if (!isElementNode(node)) return Handler.continue(node);

    const { tagName } = node;
    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const element = _manifest.elements[tagName];
    if (element?.classLoader) {
      const ElementClass = await element.classLoader();
      const instance = new ElementClass();

      Object.defineProperty(node, HANDLER_INSTANCE, {
        enumerable: true,
        value: instance,
      });
    }

    return Handler.continue(node);
  },
);
