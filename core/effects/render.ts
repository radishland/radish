import type { MFragment, MNode } from "@radish/htmlcrunch";
import { createEffect, type Effect } from "@radish/effect-system";
import type { ManifestBase } from "../types.d.ts";
import type { AnyConstructor } from "@std/assert";

export type ElementManifest = {
  kind: "element";
  tagName: string;
  path: string;
  files: string[];
  classLoader?: () => Promise<AnyConstructor>;
  templateLoader?: () => MFragment;
  dependencies?: string[];
};

export type RouteManifest = {
  kind: "route";
  path: string;
  files: string[];
  templateLoader: () => MFragment;
  dependencies: string[];
};

export type LayoutManifest = {
  kind: "layout";
  path: string;
  templateLoader: () => MFragment;
  dependencies: string[];
};

export type Manifest = ManifestBase & {
  elements: Record<string, ElementManifest>;
  routes: Record<string, RouteManifest>;
  layouts: Record<string, LayoutManifest>;
};

interface RenderOps {
  transformNode: (node: MNode) => MNode;
  component: (element: ElementManifest) => string;
  route: (
    route: RouteManifest,
    insertHead: string,
    insertBody: string,
  ) => string;
  directive: (node: MNode, key: string, value: string) => void;
}

export const render: {
  /**
   * Prepares a node to be serialized
   */
  transformNode: (node: MNode) => Effect<MNode>;
  component: (element: ElementManifest) => Effect<string>;
  route: (
    route: RouteManifest,
    insertHead: string,
    insertBody: string,
  ) => Effect<string>;
  /**
   * Asks for the interpretation of element attribute directives
   */
  directive: (node: MNode, key: string, value: string) => Effect<void>;
} = {
  transformNode: createEffect<RenderOps["transformNode"]>(
    "render/transformNode",
  ),
  component: createEffect<RenderOps["component"]>("render/component"),
  route: createEffect<RenderOps["route"]>("render/route"),
  directive: createEffect<RenderOps["directive"]>("render/directive"),
};
