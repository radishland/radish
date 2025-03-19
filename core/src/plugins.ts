import { dev } from "$env";
import strip from "@fcrozatier/type-strip";
import { fragments, shadowRoot } from "@radish/htmlcrunch";
import { basename, dirname, extname, join, relative } from "@std/path";
import { serializeFragments } from "../../htmlcrunch/mod.ts";
import {
  buildFolder,
  elementsFolder,
  generatedFolder,
  routesFolder,
  ts_extension_regex,
} from "./constants.ts";
import type { ElementManifest, Manifest } from "./generate/manifest.ts";
import type { SpeculationRules } from "./generate/speculationrules.ts";
import type { Plugin } from "./types.d.ts";
import { fileName, kebabToPascal } from "./utils.ts";
import {
  applyServerEffects,
  dependencies,
  serializeWebComponent,
} from "./walk.ts";

/**
 * Default plugin mirroring the source folder structure inside the build folder
 */
export const pluginDefaultEmit: Plugin = {
  name: "radish-plugin-default-emit",
  emit: (path) => join(buildFolder, path),

  handleHotUpdate(event, context) {
    if (event.kind === "remove") {
      try {
        Deno.removeSync(event.target, { recursive: !event.isFile });
        console.log(`${this.name}: removed`, event.path);

        // don't process files under the removed path
        context.paths = context.paths.filter((f) =>
          relative(event.path, f).startsWith("..")
        );
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        }
      }
    }
  },
};

/**
 * Strip Types
 *
 * Removes type annotations and comments
 */
export const pluginStripTypes: Plugin = {
  name: "radish-plugin-strip-types",
  transform: (code, path, context) => {
    if (context.format !== ".ts" || path.endsWith(".d.ts")) return null;

    return strip(code, {
      removeComments: true,
      tsToJsModuleSpecifiers: true,
    });
  },
  emit: (path) => {
    if (extname(path) !== ".ts" || path.endsWith(".d.ts")) return null;
    return join(buildFolder, path).replace(ts_extension_regex, ".js");
  },
  handleHotUpdate(event) {
    if (!event.isFile) return;

    if (
      event.isFile &&
      event.kind === "remove" &&
      extname(event.path) === ".ts" &&
      !event.path.endsWith(".d.ts")
    ) {
      // Delegates removal of the compiled .js file
      event.target = event.target.replace(ts_extension_regex, ".js");
    }
  },
};

export const pluginTransformElements: Plugin = {
  name: "radish-plugin-transform-elements",
  transform: (_code, path, context) => {
    if (context.format !== ".html") return null;

    const filename = fileName(path);
    const element = context.manifest.elements[filename];

    if (!element) return null;

    return serializeWebComponent(element);
  },
};

/**
 * Ensures a path only consists of parent folders
 */
const is_parent_path_regex = /^\.\.(\/\.\.)*$/;

export const pluginTransformRoutes: () => Plugin = () => {
  const appContent = Deno.readTextFileSync(
    join(routesFolder, "_app.html"),
  );

  const importmapContent = Deno.readTextFileSync(
    join(generatedFolder, "importmap.json"),
  );

  let speculationRules: SpeculationRules | undefined;

  return {
    name: "radish-plugin-transform-routes",
    configResolved: (config) => {
      speculationRules = config?.speculationRules;
    },
    transform: (_code, path, context) => {
      if (context.format !== ".html") return null;

      const route = (context.manifest as Manifest).routes[dirname(path)];

      if (!route) return null;

      let pageHeadContent = `
    <script type="importmap">
      ${importmapContent}
    </script>`;

      if (speculationRules) {
        pageHeadContent += `
    <script type="speculationrules">
      ${JSON.stringify(speculationRules)}
    </script>`;
      }

      // Auto-import custom element modules
      const imports = route.dependencies.toReversed().map((dependency) => {
        const element: ElementManifest | undefined =
          context.manifest.elements[dependency];

        if (!element) return undefined;
        return element.kind === "unknown-element" ? undefined : element.files
          .find((p) => p.endsWith(".ts") || p.endsWith(".js"))
          ?.replace(ts_extension_regex, ".js");
      }).filter((i) => i !== undefined);

      if (imports.length > 0) {
        pageHeadContent += `
    <script type="module">
      ${imports.map((i) => `import "/${i}";`).join("\n\t")}
    </script>
    `;
      }
      // Insert WebSocket script
      if (dev()) {
        pageHeadContent += `
        <script>
          const ws = new WebSocket("ws://localhost:1235/ws");
          ws.onmessage = (e) => {
            if (e.data === "full-reload") {
              console.log("Reload triggered by server");
              location.reload();
            }
          };
          ws.onerror = (e) => {
            console.error("WebSocket error", e);
          };
          ws.onclose = () => {
            console.log("Websocket connection closed");
          };
        </script>`;
      }

      const layouts = Object.values((context.manifest as Manifest).layouts)
        .filter((layout) => {
          return is_parent_path_regex.test(
            dirname(relative(route.path, layout.path)),
          );
        });

      const pageFragments = layouts.map((layout) => layout.templateLoader());
      pageFragments.push(route.templateLoader().map(applyServerEffects));

      const pageGroups = Object.groupBy(
        pageFragments.flat(),
        (node) => {
          if (node.kind === "NORMAL" && node.tagName === "radish:head") {
            return "head";
          }
          return "body";
        },
      );

      if (pageGroups.head) {
        const head = pageGroups.head
          .map((node) => node.kind === "NORMAL" && node.children)
          .filter((node) => !!node).flat();

        pageHeadContent += serializeFragments(head, {
          removeComments: !dev(),
        });
      }

      let pageBodyContent = "";
      if (pageGroups.body) {
        pageBodyContent = serializeFragments(pageGroups.body, {
          removeComments: !dev(),
        });
      }

      const pageContent = appContent
        .replace("%radish.head%", pageHeadContent)
        .replace("%radish.body%", pageBodyContent);

      return pageContent;
    },
  };
};

/**
 * Extracts import specifiers
 */
const import_regex = /from\s["']([^'"]+)["']|import\(["']([^"']+)["']\)/g;

/**
 * Returns the deduped array of import aliases
 */
const extractImports = (source: string) => {
  return Array.from(
    new Set(source.matchAll(import_regex).map((match) => match[1])),
  );
};

export const manifestPlugin: Plugin = {
  name: "radish-plugin-manifest",
  manifestStart: (controller) => {
    controller.manifestImports
      .add('import { fragments, shadowRoot } from "$core/parser";');

    return {
      ...controller.manifest,
      elements: {},
      routes: {},
      layouts: {},
    } satisfies Manifest;
  },
  manifest: (entry, controller) => {
    const extension = extname(entry.name);

    if (!entry.isFile || ![".html", ".js", ".ts"].includes(extension)) {
      return null;
    }

    if (!relative(elementsFolder, entry.path).startsWith("..")) {
      /**
       * Elements
       */

      const parentFolder = basename(dirname(entry.path));
      const elementName = fileName(entry.name);

      if (parentFolder !== elementName) {
        console.warn(
          `By convention an element file has the same name as its parent folder. Skipping file ${entry.path}`,
        );
        return null;
      }

      if (!elementName.includes("-")) {
        throw new Error(
          `An element file name must include a dash.\n\nIn: ${entry.path}`,
        );
      }

      const elementMetaData: ElementManifest =
        (controller.manifest as Manifest).elements[elementName] ?? {
          kind: undefined,
          tagName: elementName,
          path: parentFolder,
          files: [],
        };

      switch (extension) {
        case ".html":
          {
            switch (elementMetaData.kind) {
              case "custom-element":
                elementMetaData.kind = "web-component";
                break;
              case undefined:
                elementMetaData.kind = "unknown-element";
                break;
            }

            elementMetaData.files.push(entry.path);

            let fragment;
            try {
              const content = Deno.readTextFileSync(entry.path);
              fragment = shadowRoot.parseOrThrow(content);
            } catch (error) {
              console.error(
                `Something went wrong while parsing ${entry.path}`,
              );
              throw error;
            }

            elementMetaData.dependencies = dependencies(fragment);
            // @ts-ignore
            elementMetaData.templateLoader = () =>
              `() => {
            return shadowRoot.parseOrThrow(
              Deno.readTextFileSync("${entry.path}"),
            );
          }`;
          }
          break;

        case ".js":
        case ".ts":
          {
            switch (elementMetaData.kind) {
              case "unknown-element":
                elementMetaData.kind = "web-component";
                break;
              case undefined:
                elementMetaData.kind = "custom-element";
                break;
            }

            const className = kebabToPascal(elementName);
            const content = Deno.readTextFileSync(entry.path);
            const imports = extractImports(content);

            const importPath = join("..", entry.path);
            // @ts-ignore
            elementMetaData.classLoader = () =>
              `async () => {
            return (await import("${importPath}"))["${className}"];
          }`;

            elementMetaData.files.push(entry.path);
            elementMetaData.imports = imports;
          }
          break;
      }

      (controller.manifest as Manifest).elements[elementName] = elementMetaData;

      return true;
    } else if (!relative(routesFolder, entry.path).startsWith("..")) {
      /**
       * Routes
       */

      if (extname(entry.name) === ".html") {
        let fragment;
        try {
          const content = Deno.readTextFileSync(entry.path);
          fragment = fragments.parseOrThrow(content);
        } catch (error) {
          console.error(`Something went wrong while parsing ${entry.path}`);
          throw error;
        }

        if (entry.name === "_layout.html") {
          // Layout
          (controller.manifest as Manifest).layouts[entry.path] = {
            kind: "layout",
            path: entry.path,
            dependencies: dependencies(fragment),
            templateLoader: () =>
              // @ts-ignore
              `() => {
            return fragments.parseOrThrow(Deno.readTextFileSync("${entry.path}"));
            }`,
          };
        } else if (entry.name === "index.html") {
          // Route
          (controller.manifest as Manifest).routes[entry.path] = {
            kind: "route",
            path: entry.path,
            files: [entry.path],
            templateLoader: () =>
              // @ts-ignore
              `() => {
                return fragments.parseOrThrow(Deno.readTextFileSync("${entry.path}"));
              }`,
            dependencies: dependencies(fragment),
          };
        }
      } else {
        // The extension is .js or .ts

        if (entry.name.includes("-")) {
          const tagName = fileName(entry.path);
          const className = kebabToPascal(tagName);
          const content = Deno.readTextFileSync(entry.path);
          const imports = extractImports(content);

          const override = (controller.manifest as Manifest).elements[tagName];

          if (override) {
            throw new Error(
              `There already is a custom element called ${tagName}. File ${entry.path}`,
            );
          }
          (controller.manifest as Manifest).elements[tagName] = {
            kind: "custom-element",
            tagName,
            path: entry.path,
            files: [entry.path],
            imports,
            // @ts-ignore
            classLoader: () =>
              `async () => {
            return (await import("${join("..", entry.path)}"))["${className}"];
            }`,
          };
        }
      }
    }
  },
};
