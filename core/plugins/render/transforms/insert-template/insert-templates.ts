import { assertObjectMatch } from "@std/assert";
import { isElementNode } from "@radish/htmlcrunch";
import { Handler, handlerFor } from "@radish/effect-system";
import { manifest } from "$effects/manifest.ts";
import { type Manifest, render } from "$effects/render.ts";
import { manifestShape } from "../../hooks/manifest.update.ts";
import { transformNode } from "../transform-node.ts";

/**
 * Transforms an MElement node by inserting its shadowroot template as the first child
 *
 * @performs
 * - `manifest/get`
 */
export const handleRenderTransformInsertTemplate = handlerFor(
  render.transformNode,
  async (node) => {
    if (!isElementNode(node)) return Handler.continue(node);

    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const element = _manifest.elements[node.tagName];

    if (element?.templateLoader) {
      const template = await Promise.all(
        element.templateLoader().map(transformNode),
      );
      node.children = [...template, ...(node?.children ?? [])];
    }

    return Handler.continue(node);
  },
);
