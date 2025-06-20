import { manifest } from "@radish/core/effects";
import { handlerFor } from "@radish/effect-system";
import { assertExists } from "@std/assert";
import { join } from "@std/path";

const moduleDir = import.meta.dirname;
assertExists(moduleDir);
const rootDir = join(moduleDir, "..");

export const onManifest = handlerFor(
  manifest.updateEntries,
  async (glob, options) => {
    await manifest.updateEntries(glob, options);
    await manifest.updateEntries("+(elements|routes)/**", { root: rootDir });
  },
  { once: true, reentrant: false },
);
