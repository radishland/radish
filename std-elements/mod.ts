/**
 * This packages distributes standard Radish elements
 *
 * @module
 */

import { createPackage } from "@radish/core/plugins";
import { assertExists } from "@std/assert";

const root = import.meta.dirname;
assertExists(root);

export const pluginStdElements = createPackage(
  "radish-std-elements-plugin",
  root,
);
