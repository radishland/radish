import { manifest } from "$effects/manifest.ts";
import { type Manifest, render } from "$effects/render.ts";
import { isElementNode, type MNode } from "@radish/htmlcrunch";
import { assertObjectMatch } from "@std/assert";
import { manifestShape } from "../hooks/manifest.update.ts";
import { mountHandlerRegistry } from "../state.ts";

/**
 * Transforms a node by performing server directives and inserting templates
 *
 * @performs
 * - `manifest/get`
 * - `render/transformNode`
 */
export async function transformNode(node: MNode): Promise<MNode> {
  if (!isElementNode(node)) return node;

  const { tagName } = node;
  const _manifest = await manifest.get() as Manifest;
  assertObjectMatch(_manifest, manifestShape);

  const element = _manifest.elements[tagName];
  using _ = await mountHandlerRegistry(tagName, element);

  if (node.children?.length) {
    node.children = await Promise.all(node.children.map(transformNode));
  }

  return await render.transformNode(node);
}
