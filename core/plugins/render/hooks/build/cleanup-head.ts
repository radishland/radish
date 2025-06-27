import { build } from "$effects/mod.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { getFileKind } from "../../utils/getFileKind.ts";

/**
 * Cleanup the %radish.head% in routes after the build/transform step
 */

export const onBuildTransformCleanupHead = handlerFor(
  build.transform,
  (path, content) => {
    const kind = getFileKind(path);
    if (kind !== "route") return Handler.continue(path, content);

    content = content.replace(/^\s*%radish.head%\n?/m, "");
    return Handler.continue(path, content);
  },
);
