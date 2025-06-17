import { manifest } from "$effects/manifest.ts";
import { io } from "$effects/mod.ts";
import { type Manifest, render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { isElementNode, shadowRoot } from "@radish/htmlcrunch";
import { assertObjectMatch } from "@std/assert";
import { manifestShape } from "../../hooks/manifest/mod.ts";
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

    if (element?.templatePath) {
      const template = await io.read(element.templatePath);
      const fragments = shadowRoot.parseOrThrow(template);
      const transformed = await Promise.all(fragments.map(transformNode));

      node.children = [...transformed, ...(node?.children ?? [])];
    }

    return Handler.continue(node);
  },
);
