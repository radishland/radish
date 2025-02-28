import {
  Generator,
  type GeneratorOptions,
  type Install,
} from "@jspm/generator";
import type { IImportMap } from "@jspm/import-map";
import { join } from "@std/path";
import { readDenoConfig } from "../config.ts";
import { generatedFolder } from "../conventions.ts";
import type { Manifest } from "./manifest.ts";

interface ImportMapOptions {
  dev?: boolean;
  /**
   * Manually add a package target into the import map, including all its dependency resolutions via tracing
   */
  install?: string | Install | (string | Install)[];
  generatorOptions?: GeneratorOptions;
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

export const generateImportMap = async (
  manifest: Manifest,
  denoImports: Record<string, string>,
  options?: ImportMapOptions,
): Promise<IImportMap> => {
  const { dev, generatorOptions } = { ...options, dev: false };
  const projectImports = new Set<string>();

  // Collect deduped import specifiers
  for (const element of Object.values(manifest.elements)) {
    if (element.kind === "unknown-element") continue;

    for (const elementImport of element.imports) {
      projectImports.add(elementImport);
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
    defaultProvider: "jspm.io",
    env: [
      dev ? "development" : "production",
      "browser",
      "module",
      "import",
      "default",
    ],
    ...generatorOptions,
  });

  // For relative imports and https: targets
  const manualImportMap = new Map<string, string>();

  for (const [alias, specifiers] of Object.entries(projectAliasTargetMap)) {
    const target = denoImports[alias];

    // relative imports
    if (target?.startsWith("./")) {
      manualImportMap.set(
        alias,
        target.replace(/^\.\//, "/").replace(/\.ts$/, ".js"),
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
    await generator.install(options.install);
  }

  const { imports, scopes, integrity } = generator.getMap();

  return {
    imports: { ...imports, ...Object.fromEntries(manualImportMap.entries()) },
    scopes,
    integrity,
  };
};

export const importMap = async (
  manifest: Manifest,
  options?: ImportMapOptions & {
    /**
     * Provides a transform hook giving you full control over the generated importmap
     *
     * @param importmap The generated importmap
     * @return The JSON stringified importmap
     */
    transform?: (importmap: IImportMap) => string;
  },
): Promise<void> => {
  console.log("Generating importmap...");

  const denoConfig = readDenoConfig();

  const importmap = await generateImportMap(
    manifest,
    denoConfig.imports ?? {},
    options,
  );

  Deno.writeTextFileSync(
    join(generatedFolder, "importmap.json"),
    options?.transform
      ? options.transform(importmap)
      : JSON.stringify(importmap),
  );
};
