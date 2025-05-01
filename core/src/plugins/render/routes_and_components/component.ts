import { serializeFragments } from "@radish/htmlcrunch";
import { handlerFor } from "../../../effects/effects.ts";
import { render } from "../../../effects/render.ts";
import { reifyNode } from "./common.ts";

export const handleComponent = handlerFor(render.component, async (element) => {
  if (!element?.templateLoader) return;
  const nodes = await Promise.all(
    element.templateLoader().map(reifyNode),
  );
  return serializeFragments(nodes);
});
