/**
 * This packages distributes standard Radish elements
 *
 * @module
 */

import type { Plugin } from "@radish/effect-system";
import { onManifest } from "./hooks/manifest.ts";
import { onBuildDest, onBuildStart } from "./hooks/build.ts";

export const elementsPlugin: Plugin = {
  name: "elements-plugin",
  handlers: [onManifest, onBuildStart, onBuildDest],
};
