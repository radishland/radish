import { appPath, target_head } from "$lib/conventions.ts";
import { handlerFor } from "@radish/effect-system";
import { fs } from "$effects/fs.ts";
import { render } from "$effects/render.ts";
import { build } from "$effects/mod.ts";

/**
 * @performs
 * - `build/dest`
 * - `fs/read`
 */
export const handleRouteBase = handlerFor(
  render.route,
  async (_route, insertHead, insertBody) => {
    const appSkeletonPath = await build.dest(appPath);
    const appSkeleton = await fs.read(appSkeletonPath);

    return appSkeleton
      .replace(target_head, insertHead)
      .replace("%radish.body%", insertBody);
  },
);
