import { build } from "@radish/core/effects";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { assertExists } from "@std/assert";
import { join, relative } from "@std/path";

const moduleDir = import.meta.dirname;
assertExists(moduleDir);
const rootDir = join(moduleDir, "..");

export const onBuildFiles = handlerFor(build.files, async (glob, options) => {
  {
    using _ = new HandlerScope(onBuildDest);

    await build.files(`+(elements|routes)/**`, { root: rootDir });
  }

  return Handler.continue(glob, options);
}, { reentrant: false });

const onBuildDest = handlerFor(build.dest, async (path) => {
  return await build.dest(relative(rootDir, path));
}, { reentrant: false });
