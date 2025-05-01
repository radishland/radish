import {
  isElementNode,
  Kind,
  type MFragment,
  type MNode,
} from "@radish/htmlcrunch";
import { assertObjectMatch } from "@std/assert/object-match";
import { manifest } from "../../../effects/manifest.ts";
import { type Manifest, render } from "../../../effects/render.ts";
import { manifestShape } from "../manifest.ts";
import { mountHandlerRegistry } from "../state.ts";

/**
 * Transforms a node by performing server directives and inserting templates
 */
export async function reifyNode(node: MNode): Promise<MNode> {
  await render.setCurrentNode(node);

  if (!isElementNode(node)) return node;

  const { tagName, attributes, kind } = node;
  const _manifest = await manifest.get() as Manifest;
  assertObjectMatch(_manifest, manifestShape);

  const element = _manifest.elements[tagName];
  using _ = await mountHandlerRegistry(tagName, element);

  let template: MNode[] = [];

  if (element?.templateLoader) {
    template = await Promise.all(
      element.templateLoader().map(reifyNode),
    );
  }

  for (const [attrKey, attrValue] of attributes) {
    await render.directive(attrKey, attrValue);
  }

  if (kind === Kind.VOID) {
    return { tagName, kind, attributes };
  }

  let innerHTML: MFragment = [];

  if (node.children?.length) {
    innerHTML = await Promise.all(node.children.map(reifyNode));
  }

  return {
    tagName,
    kind,
    attributes,
    children: [...template, ...innerHTML],
  };
}
