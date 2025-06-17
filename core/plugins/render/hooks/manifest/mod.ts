import type { Manifest } from "$effects/mod.ts";
import { handleManifestLoadRenderHook } from "./manifest.load.ts";
import { handleManifestUpdateRenderHook } from "./manifest.update.ts";

export const manifestShape = {
  elements: {},
  imports: {},
  layouts: {},
  routes: {},
} satisfies Manifest;

/**
 * @hooks
 * - `manifest/load`
 * - `manifest/update`
 *
 * @performs
 * - `io/read`
 * - `manifest/load`
 * - `manifest/set`
 */
export const handleManifest = [
  handleManifestUpdateRenderHook,
  handleManifestLoadRenderHook,
];
