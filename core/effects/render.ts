import { createEffect, type Effect } from "@radish/effect-system";
import type { AnyConstructor } from "@std/assert";
import type { ManifestBase } from "../types.d.ts";

export type ElementManifest = {
  kind: "element";
  tagName: string;
  path: string;
  files: string[];
  classLoader?: () => Promise<AnyConstructor>;
  templatePath?: string;
  dependencies?: string[];
};

export type RouteManifest = {
  kind: "route";
  path: string;
  files: string[];
  templatePath: string;
  dependencies: string[];
};

export type LayoutManifest = {
  kind: "layout";
  path: string;
  templatePath: string;
  dependencies: string[];
};

export type Manifest = ManifestBase & {
  elements: Record<string, ElementManifest>;
  routes: Record<string, RouteManifest>;
  layouts: Record<string, LayoutManifest>;
};

export type Tree = {
  children?: Tree[] | undefined;
};

interface RenderOps {
  parse: (path: string, content: string) => Tree[];
  transformNodes: (nodes: Tree[]) => Tree[];
  transformNode: (node: Tree) => Tree | Tree[];
  serialize: (path: string, nodes: Tree[]) => string;
}

export const render: {
  parse: (path: string, content: string) => Effect<Tree[]>;
  transformNodes: (nodes: Tree[]) => Effect<Tree[]>;
  transformNode: (node: Tree) => Effect<Tree | Tree[]>;
  serialize: (path: string, nodes: Tree[]) => Effect<string>;
} = {
  parse: createEffect<RenderOps["parse"]>("render/parse"),
  transformNodes: createEffect<RenderOps["transformNodes"]>(
    "render/transform-nodes",
  ),
  transformNode: createEffect<RenderOps["transformNode"]>(
    "render/transform-node",
  ),
  serialize: createEffect<RenderOps["serialize"]>("render/serialize"),
};
