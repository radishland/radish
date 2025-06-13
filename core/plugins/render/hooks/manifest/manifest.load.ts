import { manifest } from "$effects/manifest.ts";
import { handlerFor } from "@radish/effect-system";
import { manifestShape } from "./mod.ts";

/**
 * Ensures the manifest has the shape the render plugin expects
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
  { reentrant: false, once: true },
);
