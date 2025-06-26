import { build } from "$effects/mod.ts";
import { render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { extname } from "@std/path";

/**
 * @handles `build/transform`
 * @performs `render/parse`
 * @performs `render/transform`
 * @performs `render/serialize`
 */
export const onBuildTransform = handlerFor(
  build.transform,
  async (path, content) => {
    if (extname(path) !== ".html") return Handler.continue(path, content);

    const parsed = await render.parse(path, content);
    const transformed = await render.transformNodes(parsed);
    const serialized = await render.serialize(path, transformed);
    return serialized;
  },
);

/**
 * @handles `build/transform`
 */
export const onBuildTransformTerminal = handlerFor(
  build.transform,
  (_path, content) => content,
);
