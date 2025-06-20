import { build } from "@radish/core/effects";
import { Handler, handlerFor } from "@radish/effect-system";
import { assertExists } from "@std/assert";
import { join, relative } from "@std/path";

const moduleDir = import.meta.dirname;
assertExists(moduleDir);
const rootDir = join(moduleDir, "..");

export const onBuildFiles = handlerFor(build.files, async (glob, options) => {
  await build.files(`+(elements|routes)/**`, { root: rootDir });

  return Handler.continue(glob, options);
}, { reentrant: false });

export const onBuildDest = handlerFor(build.dest, async (path) => {
  if (path.startsWith(relative(Deno.cwd(), rootDir))) {
    return await build.dest(relative(rootDir, path));
  }

  return Handler.continue(path);
}, { reentrant: false });
