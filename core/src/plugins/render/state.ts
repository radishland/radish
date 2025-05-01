import { assertExists } from "@std/assert";
import type { MNode } from "../../../../htmlcrunch/mod.ts";
import { handlerFor } from "../../effects/effects.ts";
import { render } from "../../effects/render.ts";

let currentNode: MNode | undefined;

export const handleRenderState = [
  handlerFor(render.setCurrentNode, (node) => {
    currentNode = node;
  }),

  handlerFor(render.getCurrentNode, () => {
    assertExists(currentNode);
    return currentNode;
  }),
];
