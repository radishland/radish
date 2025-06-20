import { manifest } from "@radish/core/effects";
import { handlerFor } from "@radish/effect-system";
import { assertExists } from "@std/assert";
import { walkSync } from "@std/fs";
import { join, relative } from "@std/path";

const moduleDir = import.meta.dirname;
assertExists(moduleDir);
const rootDir = join(moduleDir, "..");
const elementsDir = join(rootDir, "elements");

export const onManifest = handlerFor(manifest.set, async (_manifest) => {
  await manifest.set(_manifest);

  // Ensure we're not updating an empty manifest
  if (_manifest && Object.hasOwn(_manifest, "elements")) {
    for (const entry of walkSync(elementsDir, { includeDirs: false })) {
      await manifest.update({
        ...entry,
        path: relative(Deno.cwd(), entry.path),
      });
    }
  }
}, { once: true, reentrant: false });
