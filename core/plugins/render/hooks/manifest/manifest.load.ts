import { manifest } from "$effects/manifest.ts";
import { handlerFor } from "@radish/effect-system";
import { manifestShape } from "./mod.ts";

/**
 * Sets a manifest loader
 *
 * @hooks
 * - `manifest/load`
 *
 * @performs
 * - `manifest/load`
 * - `manifest/set`
 */
export const handleManifestLoadRenderHook = handlerFor(
  manifest.load,
  async () => {
    const baseManifestObject = await manifest.load();
    const manifestObject = Object.assign({}, manifestShape, baseManifestObject);
    await manifest.set(manifestObject);
    return manifestObject;
  },
  { reentrant: false },
);
