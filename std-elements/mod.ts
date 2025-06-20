/**
 * This packages distributes standard Radish elements
 *
 * @module
 */

import { createPackage } from "@radish/core/plugins";
import type { Plugin } from "@radish/effect-system";
import { assertExists } from "@std/assert";

const root = import.meta.dirname;
assertExists(root);

export const pluginStdElements: Plugin = createPackage(
  "radish-std-elements-plugin",
  root,
);
