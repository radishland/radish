import { build, fs } from "$effects/mod.ts";
import { render } from "$effects/render.ts";
import { appPath } from "$lib/conventions.ts";
import { dev } from "$lib/environment.ts";
import { handlerFor } from "@radish/effect-system";
import { type MFragment, serializeFragments } from "@radish/htmlcrunch";
import { assertEquals } from "@std/assert";
import { extname } from "@std/path";
import { getFileKind } from "../utils/getFileKind.ts";

export const onRenderSerialize = handlerFor(
  render.serialize,
  async (path, nodes) => {
    assertEquals(extname(path), ".html");

    const fileKind = getFileKind(path);
    const serialized = serializeFragments(nodes as MFragment, {
      removeComments: !dev,
    });

    if (fileKind === "route") {
      const appSkeletonPath = await build.dest(appPath);
      const appSkeleton = await fs.read(appSkeletonPath);

      return appSkeleton.replace("%radish.body%", serialized);
    }

    return serialized;
  },
);
