import { manifest } from "$effects/manifest.ts";
import { fs } from "$effects/mod.ts";
import { type Manifest, render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { isElementNode, shadowRoot } from "@radish/htmlcrunch";
import { assertObjectMatch } from "@std/assert";
import { manifestShape } from "../../hooks/manifest/mod.ts";

/**
 * Transforms an MElement node by inserting its shadowroot template as the first child
 *
 * @performs `manifest/get`
 */
export const onRenderTransformNodeInsertTemplate = handlerFor(
  render.transformNode,
  async (path, node) => {
    if (!isElementNode(node)) return Handler.continue(path, node);

    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const element = _manifest.elements[node.tagName];

    if (element?.templatePath) {
      const template = await fs.read(element.templatePath);
      const fragments = shadowRoot.parseOrThrow(template);
      const children = node.children ?? [];

      for (const child of fragments) {
        child.parent = node;
      }

      node.children = [...fragments, ...children];
    }

    return Handler.continue(path, node);
  },
);
