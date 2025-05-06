import { assertObjectMatch } from "@std/assert";
import { isElementNode } from "../../../../../htmlcrunch/parser.ts";
import { handlerFor } from "../../../effects/effects.ts";
import { Handler } from "../../../effects/handlers.ts";
import { manifest } from "../../../effects/manifest.ts";
import { type Manifest, render } from "../../../effects/render.ts";
import { manifestShape } from "../manifest.ts";
import { transformNode } from "./transform_node.ts";

export const handleInsertTemplatesTransform = handlerFor(
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
