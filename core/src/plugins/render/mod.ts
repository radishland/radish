import type { Plugin } from "../../types.d.ts";
import { handleComponents } from "./components/component.ts";
import { handleDirectives } from "./directives/mod.ts";
import { handleSort } from "./hooks/build.sort.ts";
import { handleHotUpdate } from "./hooks/hot.update.ts";
import { handleTransformFile } from "./hooks/io.transformFile.ts";
import { handleManifest } from "./hooks/manifest.ts";
import { handleRoutes } from "./routes/mod.ts";
import { handleTransformNode } from "./transforms/mod.ts";

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
