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
  component: (element: ElementManifest) => string | undefined;
  route: (
    route: RouteManifest,
    insertHead: string,
    insertBody: string,
  ) => string;
  directive: (key: string, value: string) => void;
  getCurrentNode: () => MNode;
  setCurrentNode: (node: MNode) => void;
}

export const render = {
  component: createEffect<RenderOperations["component"]>("render/component"),
  route: createEffect<RenderOperations["route"]>("render/route"),
  /**
   * Asks for the interpretation of element attribute directives
   */
  directive: createEffect<RenderOperations["directive"]>("render/directive"),
  /**
   * Rendering is stateful and this hook allows other effects like directives to know which node
   * is currently being rendered
   */
  getCurrentNode: createEffect<RenderOperations["getCurrentNode"]>(
    "render/getCurrentNode",
  ),
  /**
   * Sets the current node being rendered
   */
  setCurrentNode: createEffect<RenderOperations["setCurrentNode"]>(
    "render/setCurrentNode",
  ),
};
