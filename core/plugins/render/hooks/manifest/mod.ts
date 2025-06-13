import { io } from "$effects/io.ts";
import { manifest, manifestPath } from "$effects/manifest.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { handleManifestLoadRenderHook } from "./manifest.load.ts";
import { handleManifestUpdateRenderHook } from "./manifest.update.ts";
import type { Manifest } from "$effects/mod.ts";

export const manifestShape = {
  elements: {},
  imports: {},
  layouts: {},
  routes: {},
} satisfies Manifest;

/**
 * @hooks
 * - `io/write` Inserts parser imports in the generated manifest module
 * - `manifest/load`
 * - `manifest/update`
 *
 * @performs
 * - `io/read`
 * - `manifest/load`
 * - `manifest/set`
 */

export const handleManifest = [
  /**
   * Decorator for the io/write handler
   *
   * Adds the required parser imports to the generated `manifest.ts` module
   */
  handlerFor(io.write, (path, content) => {
    if (!path.endsWith(manifestPath)) return Handler.continue(path, content);

    content =
      `import { fragments, shadowRoot } from "@radish/core/parser";\n\n${content}`;

    return Handler.continue(path, content);
  }),
  handlerFor(manifest.update, (entry) => {
    // Return early
    const returnEarly = /\.(spec|test)\.ts$/;
    if (returnEarly.test(entry.name)) return;

    return Handler.continue(entry);
  }),
  handleManifestUpdateRenderHook,
  handleManifestLoadRenderHook,
];
