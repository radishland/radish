import type { MFragment, MNode } from "@radish/htmlcrunch";
import { createEffect } from "./effects.ts";
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

interface RenderOperations {
  transformNode: (node: MNode) => MNode;
  component: (element: ElementManifest) => string;
  route: (
    route: RouteManifest,
    insertHead: string,
    insertBody: string,
  ) => string;
  directive: (node: MNode, key: string, value: string) => void;
}

export const render = {
  /**
   * Prepares a node to be serialized
   */
  transformNode: createEffect<RenderOperations["transformNode"]>(
    "render/transformNode",
  ),
  component: createEffect<RenderOperations["component"]>("render/component"),
  route: createEffect<RenderOperations["route"]>("render/route"),
  /**
   * Asks for the interpretation of element attribute directives
   */
  directive: createEffect<RenderOperations["directive"]>("render/directive"),
};
