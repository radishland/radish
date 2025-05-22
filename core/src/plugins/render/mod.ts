import type { Plugin } from "$lib/types.d.ts";
import { handleComponents } from "./components/component.ts";
import { handleDirectives } from "./directives/mod.ts";
import { handleSort } from "./hooks/build.sort.ts";
import { handleHotUpdate } from "./hooks/hmr.update.ts";
import { handleTransformFile } from "./hooks/io.transformFile.ts";
import { handleManifest } from "./hooks/manifest.ts";
import { handleRoutes } from "./routes/mod.ts";
import { handleTransformNode } from "./transforms/mod.ts";

/**
 * The render plugin
 *
 * @hooks
 * - `build/sort`
 * - `hmr/update`
 * - `io/transform`
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
    handleComponents,
    ...handleRoutes,
    handleHotUpdate,
  ],
};
