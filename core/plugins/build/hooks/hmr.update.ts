import { hmr } from "$effects/hmr.ts";
import { build, fs } from "$effects/mod.ts";
import { throwUnlessNotFound } from "$lib/utils/io.ts";
import { isParent } from "$lib/utils/path.ts";
import { Handler, handlerFor } from "@radish/effect-system";

/**
 * Updates files inside the build folder in a way that mirrors the source folder structure
 *
 * @performs
 * - `build/dest`
 */
export const buildHMRHook = handlerFor(hmr.update, async ({ event, paths }) => {
  if (event.kind === "remove") {
    try {
      const target = await build.dest(event.path);
      await fs.remove(target);
      console.log(`removed`, event.path);

      // don't process files under the removed path
      paths = paths.filter((f) => isParent(event.path, f));

      return Handler.continue({ event, paths });
    } catch (error) {
      throwUnlessNotFound(error);
    }
  }
  return Handler.continue({ event, paths });
});
