import { appPath } from "../../../constants.ts";
import { handlerFor } from "../../../effects/effects.ts";
import { io } from "../../../effects/io.ts";
import { render } from "../../../effects/render.ts";

export const handleRouteBase = handlerFor(
  render.route,
  async (_route, insertHead, insertBody) => {
    const appSkeletonPath = await io.emitTo(appPath);
    const appSkeleton = await io.readFile(appSkeletonPath);

    return appSkeleton
      .replace("%radish.head%", insertHead)
      .replace("%radish.body%", insertBody);
  },
);
