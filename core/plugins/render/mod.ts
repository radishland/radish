import type { Plugin } from "@radish/effect-system";
import { onRenderParseComposeLayouts } from "./1-parse/compose-layouts/compose-layouts.ts";
import { onRenderParse } from "./1-parse/parse.ts";
import { onRenderSerializeAutoImport } from "./2-transform/auto-import/auto-import.ts";
import { onRenderTransformAttrDirective } from "./2-transform/directives/attr/attr.ts";
import { onRenderTransformBindDirective } from "./2-transform/directives/bind/bind.ts";
import { onRenderTransformBoolDirective } from "./2-transform/directives/bool/bool.ts";
import { onRenderTransformClassListDirective } from "./2-transform/directives/classList/classList.ts";
import { onRenderTransformHtmlDirective } from "./2-transform/directives/innerHTML/html.ts";
import { onRenderTransformTextContentDirective } from "./2-transform/directives/textContent/textContent.ts";
import { handleMustache } from "./2-transform/expand-mustache/expand-mustache.ts";
import { onRenderTransformNodeInsertTemplate } from "./2-transform/insert-template/insert-templates.ts";
import { onRenderTransformNodeMountRegistries } from "./2-transform/mount-registries/mount-registries.ts";
import { onRenderTransformNodesRecurse } from "./2-transform/recurse.ts";
import { onRenderTransformNodeTerminal } from "./2-transform/terminal.ts";
import { onRenderSerialize } from "./3-serialize/serialize.ts";
import { onBuildSort } from "./hooks/build/build.sort.ts";
import { onBuildTransformCleanupHead } from "./hooks/build/cleanup-head.ts";
import { onBuildTransformRenderPipeline } from "./hooks/build/render-pipeline.ts";
import { onBuildTransformSkipAppSkeleton } from "./hooks/build/skip-app-skeleton.ts";
import { onBuildTransformInsertSpeculationRules } from "./hooks/build/speculation-rules/speculation-rules.ts";
import { onHotUpdate } from "./hooks/hmr.update.ts";
import { handleManifest } from "./hooks/manifest/mod.ts";

/**
 * The render plugin
 *
 * @hooks
 * - `build/sort`
 * - `hmr/update`
 * - `build/transform`
 * - `fs/write` Inserts parser imports in the generated manifest module
 * - `manifest/update`
 *
 * @performs
 * - `config/read`
 * - `build/dest`
 * - `fs/read`
 * - `manifest/get`
 * - `manifest/update`
 */
export const pluginRender: Plugin = {
  name: "plugin-render",
  handlers: [
    // Parse
    onRenderParseComposeLayouts,
    onRenderParse,
    // Transform Node
    onRenderTransformNodeMountRegistries,
    handleMustache,
    onRenderTransformAttrDirective,
    onRenderTransformBindDirective,
    onRenderTransformBoolDirective,
    onRenderTransformClassListDirective,
    onRenderTransformHtmlDirective,
    onRenderTransformTextContentDirective,
    onRenderTransformNodeInsertTemplate,
    onRenderTransformNodeTerminal,
    // Transform Nodes
    onRenderTransformNodesRecurse,
    // Serialize
    onRenderSerializeAutoImport,
    onRenderSerialize,
    // Hooks
    ...handleManifest,
    onBuildSort,
    onBuildTransformSkipAppSkeleton,
    onBuildTransformRenderPipeline,
    onBuildTransformInsertSpeculationRules,
    onBuildTransformCleanupHead,
    onHotUpdate,
  ],
};
