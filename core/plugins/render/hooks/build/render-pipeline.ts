import { extname } from "@std/path/extname";
import { handlerFor } from "../../../../../effect-system/effects.ts";
import { Handler } from "../../../../../effect-system/handlers.ts";
import { build } from "@radish/core/effects";
import { render } from "$effects/render.ts";

/**
 * @handles `build/transform`
 * @performs `render/parse`
 * @performs `render/transform`
 * @performs `render/serialize`
 */

export const onBuildTransformRenderPipeline = handlerFor(
  build.transform,
  async (path, content) => {
    if (extname(path) !== ".html") return Handler.continue(path, content);

    const parsed = await render.parse(path, content);
    const transformed = await render.transformNodes(path, parsed);
    const serialized = await render.serialize(path, transformed);

    return Handler.continue(path, serialized);
  },
);
