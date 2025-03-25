import { dev } from "$env";
import {
  Generator,
  type GeneratorOptions,
  type Install,
} from "@jspm/generator";
import type { IImportMap } from "@jspm/import-map";
import { join } from "@std/path";
import { readDenoConfig } from "../config.ts";
import { generatedFolder, ts_extension_regex } from "../constants.ts";
import type { ManifestBase } from "../types.d.ts";
import type { FileCache } from "../server/app.ts";

export interface ImportMapOptions {
  /**
   * Manually add a package target into the import map, including all its dependency resolutions via tracing
   *
   * Accepts a string or Install object, or an array of this type, and falsy values are skipped
   */
  install?: string | boolean | Install | (string | boolean | Install)[];
  /**
   * Options passed to the jspm generator
   */
  generatorOptions?: GeneratorOptions;
  /**
   * Provides a transform hook giving you full control over the generated importmap
   *
   * @param importmap The generated importmap
   * @return The JSON stringified importmap
   */
  transform?: (importmap: IImportMap) => string;
}

export class ImportMapController {
  path: string = join(generatedFolder, "importmap.json");
  fileCache: FileCache;
  #importmap: string | undefined;
  options?: ImportMapOptions;

  constructor(fileCache: FileCache, options?: ImportMapOptions) {
    this.fileCache = fileCache;
    this.options = options;
  }

  get importmap(): string {
    if (!this.#importmap) {
      this.#importmap = Deno.readTextFileSync(this.path);
    }
    return this.#importmap;
  }

  invalidate = (): boolean => {
    this.#importmap = undefined;
    return this.fileCache.invalidate(this.path);
  };

  /**
   * Generates the importmap of your project based on the current manifest. The file is saved inside `_generated/importmap.json`
   *
   * @param manifest The project manifest file
   * @param options
   */
  generate = async (manifest: ManifestBase): Promise<string> => {
    console.log("Generating importmap...");

    const denoConfig = readDenoConfig();

    const importmap = await pureImportMap(
      manifest,
      denoConfig.imports ?? {},
      this.options,
    );

    this.#importmap = this.options?.transform
      ? this.options.transform(importmap)
      : JSON.stringify(importmap);

    return this.importmap;
  };
}

/**
 * Find the longest prefix match of a string against a list of prefixes
 * In case of multiple same length matches, return the first match
 */
const findLongestPrefix = (str: string, list: string[]) => {
  let bestMatch: string | undefined;

  for (const prefix of list) {
    if (!str.startsWith(prefix)) continue;
    if (!bestMatch || bestMatch.length < prefix.length) {
      bestMatch = prefix;
    }
  }
  return bestMatch;
};

export const pureImportMap = async (
  manifest: ManifestBase,
  denoImports: Record<string, string>,
  options?: ImportMapOptions,
): Promise<IImportMap> => {
  const projectImports = new Set<string>();

  // Collect deduped import specifiers
  for (const imports of Object.values(manifest.imports)) {
    for (const i of imports) {
      projectImports.add(i);
    }
  }

  const aliases = Object.keys(denoImports);
  const symbol = Symbol("remaining");

  // Split the deno importmap in groups of used aliases with their target subpaths, leaving non-used aliases and relative imports
  const projectAliasTargetMap = Object.groupBy(projectImports, (item) => {
    return findLongestPrefix(item, aliases) ?? symbol;
  });

  // https: imports should be avoided
  const httpsImport = projectAliasTargetMap[symbol]?.find((e) =>
    e.startsWith("https:")
  );
  if (httpsImport) {
    console.warn(
      `Your project contains https: imports like ${httpsImport}.\n\nFor performance it is recommended to use npm: imports instead. https://deno.com/blog/not-using-npm-specifiers-doing-it-wrong`,
    );
  }

  const generator = new Generator({
    defaultProvider: dev() ? "nodemodules" : "jspm.io",
    env: [
      dev() ? "development" : "production",
      "browser",
      "module",
      "import",
      "default",
    ],
    ...options?.generatorOptions,
  });

  // For relative imports and https: targets
  const manualImportMap = new Map<string, string>();

  for (const [alias, specifiers] of Object.entries(projectAliasTargetMap)) {
    const target = denoImports[alias];

    // relative imports
    if (target?.startsWith("./")) {
      manualImportMap.set(
        alias,
        target.replace(/^\.\//, "/").replace(ts_extension_regex, ".js"),
      );

      // npm modules
    } else if (target?.startsWith("npm:")) {
      if (!specifiers) continue;
      const subpaths = specifiers.map((s) =>
        s.replace(alias, ".")
      ) as ("." | `./${string}`)[];

      await generator.install({
        target: target.replace("npm:", ""), // scope and version
        alias,
        subpaths,
      });
    } else if (target?.startsWith("https:")) {
      manualImportMap.set(alias, target);
    } else {
      // skip jsr: imports
    }
  }

  if (options?.install) {
    const install = Array.isArray(options.install)
      ? options.install
      : [options.install];

    await generator.install(install.filter((i) => typeof i !== "boolean"));
  }

  const { imports, scopes, integrity } = generator.getMap();

  return {
    imports: { ...imports, ...Object.fromEntries(manualImportMap.entries()) },
    scopes,
    integrity,
  };
};
