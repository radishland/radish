import { build } from "$effects/mod.ts";
import { appPath } from "@radish/core/conventions";
import { Handler, handlerFor } from "@radish/effect-system";

/**
 * Do not process the app skeleton through the rendering pipeline
 */

export const onBuildTransformSkipAppSkeleton = handlerFor(
  build.transform,
  (path, content) => {
    if (path.includes(appPath)) return content;
    return Handler.continue(path, content);
  },
);
