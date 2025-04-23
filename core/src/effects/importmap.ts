import { dev } from "$env";
import { assert, assertExists, unimplemented } from "@std/assert";
import { extname, join } from "@std/path";
import { generatedFolder, ts_extension_regex } from "../constants.ts";
import type { ManifestBase } from "../types.d.ts";
import { createEffect } from "./effects.ts";

export interface ImportMap {
  imports?: Record<string, string>;
  scopes?: {
    [scope: string]: Record<string, string>;
  };
  integrity?: {
    [url: string]: string;
  };
}

interface ImportmapOperations {
  get: () => ImportMap;
  write: () => void;
}

export const importmap = {
  get: createEffect<ImportmapOperations["get"]>("importmap/get"),
  write: createEffect<ImportmapOperations["write"]>("importmap/write"),
};

export const importmapPath: string = join(generatedFolder, "importmap.json");

interface Include {
  /**
   * The alias of the package in `deno.json`
   */
  alias: string;
  /**
   * Entrypoints to add to the importmap. By default the main entrypoint "." is added.
   */
  entrypoints?: string[];
}

interface Install {
  /**
   * The alias of the package as referenced by importers
   *
   * If not provided, the default alias is the scope + package name
   */
  alias?: string;
  /**
   * The package registry, scope, name and version as you would pass to `deno add`
   */
  package: `${"npm:" | "jsr:"}${string}`;
  /**
   * Entrypoints to add to the importmap. By default the main entrypoint "." is added.
   */
  entrypoints?: string[];
}

export interface ImportMapOptions {
  /**
   * Array of packages of the deno.json importmap to manually add to the importmap.
   * Falsy values are skipped
   */
  include?: (Include | boolean)[];
  /**
   * Array of packages to manually add to the importmap. Falsy values are skipped
   */
  install?: (Install | boolean)[];
}

export const pureImportMap = (
  manifest: ManifestBase,
  denoImports: Record<string, string>,
  options?: ImportMapOptions,
): ImportMap => {
  // Dedupes import specifiers
  const importSpecifiers = new Set(Object.values(manifest.imports).flat());
  const aliases = Object.keys(denoImports);

  // Splits the deno importmap in groups of used aliases with their subpaths
  const pathsByAlias = new Map<string, string[]>();

  for (const specifier of importSpecifiers) {
    // Skips relative and https import as they can be resolved the in the browser directly
    if (specifier.startsWith("./") || specifier.startsWith("https")) continue;

    const { prefix: alias, path } = findLongestMatchingPrefix(
      specifier,
      aliases,
    );

    assertExists(alias, `Unresolved module specifier ${specifier}`);

    const paths = pathsByAlias.get(alias) ?? [];

    if (!paths.includes(path)) {
      pathsByAlias.set(alias, [...paths, path]);
    }
  }

  const importsMap = new Map<string, string>();

  const addPackage = (target: string, alias: string, paths: string[]) => {
    // relative imports
    if (target?.startsWith("./")) {
      if (extname(target)) {
        assert(
          paths.every((p) => p === ""),
          "Can't target a subpath of a module",
        );

        importsMap.set(
          alias,
          target.replace(/^\.\//, "/").replace(ts_extension_regex, ".js"),
        );
      } /**  relative dir */ else {
        for (const path of paths) {
          importsMap.set(
            alias + path,
            (target + path)
              .replace(/^\.\//, "/")
              .replace(ts_extension_regex, ".js"),
          );
        }
      }

      // npm modules
    } else if (target?.startsWith("npm:")) {
      for (const path of paths) {
        const packageName = target.replace("npm:", ""); // scope, name and version
        const devMode = dev() ? "?dev" : "";
        importsMap.set(
          alias + path,
          `https://esm.sh/${packageName}/${path.replace(/^\//, "")}${devMode}`,
        );
      }
    } else if (target?.startsWith("jsr:")) {
      for (const path of paths) {
        const packageName = target.replace("jsr:", ""); // scope, name and version
        importsMap.set(
          alias + path,
          `https://esm.sh/jsr/${packageName}/${path.replace(/^\//, "")}`,
        );
      }
    } else if (target?.startsWith("https:")) {
      importsMap.set(alias, target);

      for (const path of paths) {
        importsMap.set(alias + path, target + path);
      }
    } else {
      unimplemented(` registry in ${target}.`);
    }
  };

  for (const [alias, paths] of pathsByAlias.entries()) {
    const target = denoImports[alias];
    assertExists(target);

    addPackage(target, alias, paths);
  }

  if (options?.include) {
    for (const include of options.include) {
      if (typeof include === "object") {
        const { alias, entrypoints = ["."] } = include;
        const paths = entrypoints.map((entry) => entry.replace(/^\./, ""));
        const target = denoImports[alias];

        assertExists(target);
        addPackage(target, alias, paths);
      }
    }
  }

  if (options?.install) {
    for (const install of options.install) {
      if (typeof install === "object") {
        let { alias, package: target, entrypoints = ["."] } = install;
        const paths = entrypoints.map((entry) => entry.replace(/^\./, ""));

        /**
         * If no alias was provided just remove the registry and version
         */
        alias ??= target.replace(/^[a-z]{3}:/, "").replace(/@[^@\/]+$/, "");

        addPackage(target, alias, paths);
      }
    }
  }

  return {
    imports: {
      ...Object.fromEntries(importsMap.entries()),
    },
  };
};

/**
 * Finds the longest matching prefix of an import specifier against a list of prefixes
 *
 * Returns the (first) longest prefix of the list such that either the specifier and the
 * prefix are equal or the specifier is a subpath of its prefix (proper prefix)
 *
 * In the case of a proper prefix, the nonempty subpath is returned as well
 *
 * If the specifier doesn't match against the list, the best match is `undefined`
 */
export const findLongestMatchingPrefix = (
  specifier: string,
  prefixes: string[],
) => {
  let bestMatch: string | undefined;
  let path = "";

  for (const prefix of prefixes) {
    if (!specifier.startsWith(prefix)) continue;

    /**
     * If the whole prefix does not match then either the prefix is a directory ('/' suffix) or the specifier is a subpath ('/' prefix on the remaining part)
     */
    const remaining = specifier.slice(prefix.length);
    if (
      remaining.length > 0 &&
      !remaining.startsWith("/") &&
      !prefix.endsWith("/")
    ) continue;

    if (!bestMatch || bestMatch.length < prefix.length) {
      bestMatch = prefix;
      path = remaining;
    }
  }
  return { prefix: bestMatch, path };
};
