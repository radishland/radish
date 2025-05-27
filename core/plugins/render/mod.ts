import type { Plugin } from "@radish/effect-system";
import { handleRenderComponents } from "./components/component.ts";
import { handleDirectives } from "./directives/mod.ts";
import { handleSort } from "./hooks/build.sort.ts";
import { handleTransformFile } from "./hooks/build.transform.ts";
import { handleHotUpdate } from "./hooks/hmr.update.ts";
import { handleManifest } from "./hooks/manifest.ts";
import { handleRoutes } from "./routes/mod.ts";
import { handleTransformNode } from "./transforms/mod.ts";

/**
 * The render plugin
 *
 * @hooks
 * - `build/sort`
 * - `hmr/update`
 * - `build/transform`
 * - `io/write` Inserts parser imports in the generated manifest module
 * - `manifest/update`
 *
 * @performs
 * - `config/read`
 * - `build/dest`
 * - `io/read`
 * - `manifest/get`
 * - `manifest/update`
 */
export const pluginRender: Plugin = {
  name: "plugin-render",
  handlers: [
    handleSort,
    handleTransformFile,
    ...handleDirectives,
    ...handleTransformNode,
    ...handleManifest,
    handleRenderComponents,
    ...handleRoutes,
    handleHotUpdate,
  ],
};
