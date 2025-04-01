import { ensureDirSync, walkSync } from "@std/fs";
import { join } from "@std/path";
import { type } from "@radish/runtime/utils";
import {
  elementsFolder,
  generatedFolder,
  libFolder,
  routesFolder,
} from "../constants.ts";
import type { ManifestBase, ManifestContext, Plugin } from "../types.d.ts";
import type { FileCache } from "../server/app.ts";
import { SCOPE } from "../plugins.ts";

/**
 * The path to the manifest file
 */
export const manifestPath = join(generatedFolder, "manifest.ts");

export class ManifestController {
  manifestImports: Set<string> = new Set<string>();
  manifest: ManifestBase = { imports: {} };
  fileCache: FileCache;

  #plugins: Plugin[];
  #match = [
    new RegExp("^" + elementsFolder + "/"),
    new RegExp("^" + routesFolder + "/"),
    new RegExp("^" + libFolder + "/"),
  ];

  /**
   * Reloads the `manifest` object in memory and clears the old `manifestImports` Set
   */
  reloadManifest: () => Promise<ManifestBase>;

  constructor(
    plugins: Plugin[],
    load: () => Promise<ManifestBase>,
    fileCache: FileCache,
  ) {
    this.#plugins = plugins;
    this.reloadManifest = async () => {
      this.manifest = await load();

      this.manifestImports.clear();
      this.manifestImports = new Set(
        this.fileCache
          .readTextFileSync(manifestPath)
          .matchAll(/^import.*;$/gm)
          .map((m) => m[0]),
      );
      return this.manifest;
    };
    this.fileCache = fileCache;
  }

  createManifest = (): void => {
    console.log("Generating manifest...");

    for (const plugin of this.#plugins) {
      if (plugin.manifestStart) {
        this.manifest = plugin.manifestStart(this);
      }
    }

    const context: ManifestContext = {
      manifest: this.manifest,
      fileCache: this.fileCache,
    };

    for (const entry of walkSync(".", { match: this.#match })) {
      for (const plugin of this.#plugins) {
        plugin.manifest?.(entry, context);
      }
    }
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

    Deno.writeTextFileSync(manifestPath, file);
  }

  #stringifyFunction = (fn: (...args: unknown[]) => unknown) => {
    let serialized = fn.toString();

    if (!Object.hasOwn(fn, SCOPE)) return serialized;

    const scope = Object.getOwnPropertyDescriptor(fn, SCOPE)?.value;

    for (const key of Object.keys(scope)) {
      const value = JSON.stringify(scope[key]);
      serialized = serialized.replaceAll(
        new RegExp(`\\b${key}\\b`, "g"),
        value,
      );
    }

    return serialized;
  };

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
        str += `${this.#stringifyFunction(v)},`;
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
        case "AsyncFunction":
          str += `${key}: ${this.#stringifyFunction(v)},`;
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
}
