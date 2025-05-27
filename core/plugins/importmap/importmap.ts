import {
  type ImportMap,
  importmap,
  importmapPath,
} from "$effects/importmap.ts";
import { build, config, denoConfig, io, manifest } from "$effects/mod.ts";
import { target_head, ts_extension_regex } from "$lib/constants.ts";
import { dev } from "$lib/environment.ts";
import type { ManifestBase } from "$lib/types.d.ts";
import { throwUnlessNotFound } from "$lib/utils/io.ts";
import { Handler, handlerFor, type Plugin } from "@radish/effect-system";
import { assert, assertExists, assertMatch, unimplemented } from "@std/assert";
import { basename, extname } from "@std/path";
import { dedent } from "@std/text/unstable-dedent";
import { findLongestMatchingPrefix } from "../resolve.ts";

let importmapObject: ImportMap = {};

const handleImportmapGet = handlerFor(importmap.get, async () => {
  if (!importmapObject.imports) {
    try {
      importmapObject = JSON.parse(await io.read(importmapPath));
    } catch (error) {
      throwUnlessNotFound(error);
    }
  }

  return importmapObject;
});
handleImportmapGet[Symbol.dispose] = () => {
  importmapObject = {};
};

/**
 * @hooks
 * - `build/transform` Inserts the importmap in the app skeleton
 *
 * @performs
 * - `io/read`
 * - `io/write`
 * - `build/transform`
 */
export const pluginImportmap: Plugin = {
  name: "plugin-importmap",
  handlers: [
    handleImportmapGet,
    handlerFor(importmap.write, async () => {
      await io.write(importmapPath, JSON.stringify(importmapObject));
    }),
    handlerFor(build.transform, async (path, content) => {
      if (basename(path) === "_app.html") {
        const pageHeadContent = dedent`
        <script type="importmap">
          ${JSON.stringify(await importmap.get())}
        </script>
        %radish.head%`.split("\n").map((line) => `    ${line}`).join("\n");

        assertMatch(
          content,
          target_head,
          `%radish.head% target not found in file "${path}". Try moving the importmap plugin down the list.`,
        );
        content = content.replace(target_head, "\n" + pageHeadContent);
      }

      return Handler.continue(path, content);
    }),
  ],
};

/**
 * Generates the importmap of based on the manifest.
 *
 * @performs
 * - `config/read`
 * - `denoConfig/read`
 * - `manifest/read`
 */
export const generateImportmap = async (): Promise<void> => {
  console.log("Generating importmap...");

  const deno = await denoConfig.read();
  const manifestObject = await manifest.get();
  const options = await config.read();

  importmapObject = pureImportMap(
    manifestObject,
    deno.imports ?? {},
    options.importmap,
  );
};

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
   * Manually adds packages of your `deno.json` importmap to the browser importmap by specifying the alias and entrypoints
   *
   * Falsy values are skipped
   */
  include?: (Include | boolean)[];
  /**
   * Manually adds packages to the importmap. Falsy values are skipped
   *
   * Packages are resolved from the `esm.sh` CDN
   *
   * Falsy values are skipped
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

    // assertExists(alias, `Unresolved module specifier ${specifier}`);
    // TODO we should throw if the specifier couldn't be resolved
    if (!alias) continue;

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
        const devMode = dev ? "?dev" : "";
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
