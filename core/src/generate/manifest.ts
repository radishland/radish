import { ensureDirSync, walkSync } from "@std/fs";
import { join } from "@std/path";
import { type } from "../../../runtime/src/utils.ts";
import {
  elementsFolder,
  generatedFolder,
  libFolder,
  routesFolder,
} from "../constants.ts";
import type { ManifestBase, ManifestContext, Plugin } from "../types.d.ts";
import type { FileCache } from "../server/app.ts";

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

  loadManifest: () => Promise<ManifestBase>;

  constructor(
    plugins: Plugin[] = [],
    load: () => Promise<ManifestBase>,
    fileCache: FileCache,
  ) {
    this.#plugins = plugins;
    this.loadManifest = async () => {
      this.manifest = await load();
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
      manifestController: this,
    };

    for (const entry of walkSync(".", { match: this.#match })) {
      for (const plugin of this.#plugins) {
        plugin.manifest?.(entry, context);
      }
    }
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
