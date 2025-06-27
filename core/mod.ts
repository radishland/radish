import {
  pluginBuild,
  pluginConfig,
  pluginEnv,
  pluginFS,
  pluginHMR,
  pluginImportmap,
  pluginManifest,
  pluginRender,
  pluginRouter,
  pluginServer,
  pluginStripTypes,
  pluginWS,
} from "@radish/core/plugins";
import { pluginStdElements } from "@radish/std-elements";

export { importmapPath } from "$effects/importmap.ts";
export { manifestPath } from "$effects/manifest.ts";
export { onDispose } from "./cleanup.ts";
export * from "./conventions.ts";
export { startApp } from "./start.ts";
export type { Config, ManifestBase } from "./types.d.ts";

export const radishPlugins = [
  pluginStdElements,
  pluginWS,
  pluginServer,
  pluginRouter,
  pluginImportmap,
  pluginRender,
  pluginManifest,
  pluginHMR,
  pluginStripTypes,
  pluginBuild,
  pluginEnv,
  pluginConfig,
  pluginFS,
];
