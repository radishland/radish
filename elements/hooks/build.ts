import { build } from "@radish/core/effects";
import { Handler, handlerFor } from "@radish/effect-system";
import { assertExists } from "@std/assert";
import { join, relative } from "@std/path";

const moduleDir = import.meta.dirname;
assertExists(moduleDir);
const rootDir = join(moduleDir, "..");
const elementsDir = join(rootDir, "elements");

export const onBuildStart = handlerFor(build.start, async (args) => {
  await build.start([`${elementsDir}/**`]);

  return Handler.continue(args);
});

export const onBuildDest = handlerFor(build.dest, async (path) => {
  if (path.startsWith(relative(Deno.cwd(), elementsDir))) {
    await build.start([`${elementsDir}/**`]);
    return await build.dest(relative(rootDir, path));
  }

  return Handler.continue(path);
});
