import { appPath } from "$lib/constants.ts";
import { handlerFor } from "@radish/effect-system";
import { io } from "$effects/io.ts";
import { render } from "$effects/render.ts";
import { build } from "$effects/mod.ts";

/**
 * @performs
 * - `build/dest`
 * - `io/read`
 */
export const handleRouteBase = handlerFor(
  render.route,
  async (_route, insertHead, insertBody) => {
    const appSkeletonPath = await build.dest(appPath);
    const appSkeleton = await io.read(appSkeletonPath);

    return appSkeleton
      .replace("%radish.head%", insertHead)
      .replace("%radish.body%", insertBody);
  },
);
