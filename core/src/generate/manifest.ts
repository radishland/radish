import type { MFragment } from "@radish/htmlcrunch";
import { ensureDirSync, walkSync } from "@std/fs";
import { join } from "@std/path";
import { type } from "../../../runtime/src/utils.ts";
import {
  elementsFolder,
  generatedFolder,
  libFolder,
  routesFolder,
} from "../constants.ts";
import type { ManifestBase, Plugin } from "../types.d.ts";

type Constructor<T = any> = new (...args: any[]) => T;

export type ElementManifest = {
  kind: "web-component" | "custom-element" | "unknown-element" | undefined;
  tagName: string;
  path: string;
  files: string[];
  classLoader?: () => Promise<Constructor>;
  templateLoader?: () => MFragment;
  dependencies?: string[];
  imports?: string[];
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

export class ManifestController {
  manifestImports = new Set<string>();
  manifest: ManifestBase = {};

  #plugins: Plugin[];
  #match = [
    new RegExp("^" + elementsFolder + "/"),
    new RegExp("^" + routesFolder + "/"),
    new RegExp("^" + libFolder + "/"),
  ];

  loadManifest;

  constructor(
    plugins: Plugin[] = [],
    load: () => Promise<ManifestBase>,
  ) {
    this.#plugins = plugins;
    this.loadManifest = async () => {
      this.manifest = await load();
      return this.manifest;
    };
  }

  start() {
    console.log("Generating manifest...");

    for (const plugin of this.#plugins) {
      if (plugin.manifestStart) {
        this.manifest = plugin.manifestStart(this);
      }
    }
  }

  update() {
    entries: for (const entry of walkSync(".", { match: this.#match })) {
      for (const plugin of this.#plugins) {
        const updated = plugin.manifest?.(entry, this);

        if (updated) continue entries;
      }
    }
  }

  #stringifyArray = (arr: Array<any>) => {
    let str = "[";

    for (const v of arr) {
      if (["undefined", "boolean", "number"].includes(typeof v)) {
        str += `${v},`;
      } else if (typeof v === "string") {
        str += `${JSON.stringify(v)},`;
      } else if (v === null) {
        str += `null,`;
      } else if (typeof v === "object") {
        if (Array.isArray(v)) {
          str += `${this.#stringifyArray(v)},`;
        } else {
          str += `${this.#stringifyObject(v)},`;
        }
      } else if (typeof v === "function") {
        str += `${v()},`;
      }
    }

    str += "]";

    return str;
  };

  #stringifyObject = (obj: Record<string, any>) => {
    let str = "{";

    for (const [k, v] of Object.entries(obj)) {
      const key = /(^\d|\W)/.test(k) ? JSON.stringify(k) : k;
      switch (type(v)) {
        case "undefined":
        case "null":
        case "boolean":
        case "number":
          str += `${key}: ${v},`;
          break;
        case "string":
          str += `${key}: ${JSON.stringify(v)},`;
          break;
        case "array":
          str += `${key}: ${this.#stringifyArray(v)},`;
          break;
        case "class":
          str += `${key}: ${v},`;
          break;
        case "function":
          str += `${key}: ${v()},`;
          break;
        case "object":
          str += `${key}: ${this.#stringifyObject(v)},`;
          break;

        default:
          str += `${key}: ${v},`;
          break;
      }
    }

    str += "}";

    return str;
  };

  write() {
    ensureDirSync(generatedFolder);

    let file = [...this.manifestImports.keys()].join("\n");
    file += "\n\nexport const manifest = ";
    file += this.#stringifyObject(this.manifest);

    for (const plugin of this.#plugins) {
      if (plugin.manifestWrite) {
        file = plugin.manifestWrite(file);
      }
    }

    Deno.writeTextFileSync(join(generatedFolder, "manifest.ts"), file);
  }
}

/**
 * Return the build order of a list of components, taking their relative dependencies into account
 */
export function sortComponents<
  T extends
    | Pick<ElementManifest, "tagName" | "dependencies" | "path">
    | Pick<RouteManifest, "dependencies" | "path">,
>(components: T[]): T[] {
  const ids = new Set<string>();

  let sorted: T[] = [];

  let prevLength = components.length;
  while (components.length > 0) {
    // Find the leaves
    const { leaveNodes, interiorNodes } = Object.groupBy(components, (c) => {
      return c.dependencies?.every((d) => ids.has(d))
        ? "leaveNodes"
        : "interiorNodes";
    });

    if (leaveNodes) {
      sorted = sorted.concat(leaveNodes);

      for (const leave of leaveNodes) {
        if ("tagName" in leave) {
          ids.add(leave.tagName);
        }
      }
    }

    if (interiorNodes) {
      // Update remaining components
      components = interiorNodes;
    }

    if (prevLength === components.length) {
      // In case the dependency graph is not a tree (recursive components?)
      break;
    }

    prevLength = components.length;
  }

  return sorted.concat(components);
}
