import { dev } from "$env";
import strip from "@fcrozatier/type-strip";
import {
  booleanAttributes,
  fragments,
  Kind,
  type MFragment,
  type MNode,
  serializeFragments,
  shadowRoot,
  textNode,
} from "@radish/htmlcrunch";
import { basename, dirname, extname, join, relative } from "@std/path";
import {
  buildFolder,
  elementsFolder,
  generatedFolder,
  routesFolder,
  ts_extension_regex,
} from "./constants.ts";
import type { SpeculationRules } from "./generate/speculationrules.ts";
import type { ManifestBase, Plugin } from "./types.d.ts";
import { fileName, kebabToPascal } from "./utils.ts";
import { dependencies } from "./walk.ts";
import type { HandlerRegistry } from "../../runtime/src/handler-registry.ts";
import { bindingConfig, spaces_sep_by_comma } from "../../runtime/src/utils.ts";

/**
 * Emits files inside the build folder in a way that mirrors the source folder structure
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
 * Strips Types
 *
 * Removes type annotations and comments and handles path rewriting
 */
export const pluginStripTypes: Plugin = {
  name: "radish-plugin-strip-types",
  transform: (code, path, context) => {
    if (context.format !== ".ts" || path.endsWith(".d.ts")) return null;

    return strip(code, { removeComments: true, pathRewriting: true });
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

type Constructor<T = any> = new (...args: any[]) => T;

export type ElementManifest = {
  kind: "element";
  tagName: string;
  path: string;
  files: string[];
  classLoader?: () => Promise<Constructor>;
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

/**
 * This built-in plugin invalidates the file cache when a file is modified or removed
 */
export const pluginCacheInvalidation: Plugin = {
  name: "radish-plugin-invalidate-cache",
  handleHotUpdate: (entry, context) => {
    if (entry.isFile && (entry.kind === "modify" || entry.kind === "remove")) {
      context.app.fileCache.invalidate(entry.path);
    }
  },
};

/**
 * Adds the built-in plugins to the user config
 */
export const pluginDefaultPlugins: Plugin = {
  name: "radish-plugin-default-plugins",
  config: (userConfig) => {
    return {
      ...userConfig,
      plugins: [pluginCacheInvalidation, ...(userConfig.plugins ?? [])],
    };
  },
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

/**
 * Extracts imports from .js & .ts files into the manifest for the importmap generation
 */
export const pluginImports: Plugin = {
  name: "radish-plugin-imports",
  manifest: (entry, { manifest, fileCache }) => {
    if (!entry.isFile || ![".js", ".ts"].includes(extname(entry.path))) {
      return;
    }

    const content = fileCache.readTextFileSync(entry.path);

    manifest.imports[entry.path] = extractImports(content);
  },
  handleHotUpdate(event, context) {
    if (event.isFile) {
      const manifestImports = context.app.manifestController.manifest.imports;

      if (event.kind === "remove") {
        delete manifestImports[event.path];
      } else if (event.kind === "modify") {
        if (!event.isFile || ![".js", ".ts"].includes(extname(event.path))) {
          return;
        }

        const content = context.app.fileCache.readTextFileSync(event.path);
        const newImports = extractImports(content);
        const oldImports = manifestImports[event.path];

        if (
          !oldImports ||
          !(newImports.length !== oldImports.length &&
            (new Set(newImports)).isSubsetOf(new Set(oldImports)))
        ) {
          manifestImports[event.path] = newImports;

          if (oldImports) {
            context.app.importmapController.invalidate();
          }
        }
      }
    }
  },
};

/**
 * Ensures a path only consists of parent folders
 */
const is_parent_path_regex = /^\.\.(\/\.\.)*$/;

export const pluginRadish: () => Plugin = () => {
  const appPath = join(routesFolder, "_app.html");

  let speculationRules: SpeculationRules | undefined;
  let handlerStack: { tagName: string; instance: HandlerRegistry }[] = [];

  const contextLookup = (identifier: string) => {
    for (let i = handlerStack.length - 1; i >= 0; i--) {
      const { instance } = handlerStack[i];
      if (identifier in instance) {
        // @ts-ignore identifier is in registry
        return instance.lookup(identifier)?.valueOf(); // runs the getter and returns the property or method value
      }
    }
  };

  const setAttribute = (
    attributes: [string, string][],
    attribute: string,
    value: unknown,
  ) => {
    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new Error(
        "Can only set primitive values as attributes",
      );
    }

    if (booleanAttributes.includes(attribute)) {
      value && attributes.push([attribute, ""]);
    } else {
      attributes.push([attribute, `${value}`]);
    }
  };

  const server_attr_directive = /@attr(\|server)?/;

  /**
   * Transforms a component tree by applying server-side directives, inserting templates etc
   */
  async function applyServerEffects(
    element: MNode,
    manifest: Manifest,
  ): Promise<MNode> {
    if (element.kind === "COMMENT" || element.kind === "TEXT") return element;

    const { tagName, attributes, children, kind } = element;

    let template: MNode[] = [];

    if (kind === Kind.CUSTOM) {
      const element: ElementManifest | undefined = manifest.elements[tagName];
      if (element) {
        // component is a custom element
        if (element.classLoader) {
          const ElementClass = await element.classLoader();

          handlerStack.push({
            tagName,
            instance: new ElementClass(),
          });
        }
        // component has a shadow root
        if (element.templateLoader) {
          template = await Promise.all(
            element.templateLoader().map((node) =>
              applyServerEffects(node, manifest)
            ),
          );
        }
      }
    }

    let innerHTML: MFragment = [];
    const textContent = textNode("");

    for (const attribute of attributes) {
      if (server_attr_directive.test(attribute[0])) {
        // @attr

        const assignments = attribute[1].trim().split(
          spaces_sep_by_comma,
        );

        for (const assignment of assignments) {
          const [attribute, maybeIdentifier] = assignment.split(":");
          const identifier = maybeIdentifier || attribute;

          const value = contextLookup(identifier);
          if (value !== null && value !== undefined) {
            setAttribute(attributes, attribute, value);
          }
        }
      } else if (attribute[0].startsWith("@bind")) {
        // @bind

        const property = attribute[0].split(
          ":",
        )[1] as keyof typeof bindingConfig;

        if (!Object.keys(bindingConfig).includes(property)) {
          throw new Error(`${property} is not bindable`);
        }

        const identifier = attribute[1] || property;
        const value = contextLookup(identifier);

        if (
          !bindingConfig[property].type.includes(typeof value)
        ) {
          throw new Error(
            `@bind:${property}=${identifier} should reference a value of type ${
              bindingConfig[property].type.join("|")
            } and "${identifier}" has type ${typeof value}`,
          );
        }

        setAttribute(attributes, property, value);
      } else if (attribute[0] === "@bool") {
        // @bool

        const booleanAttributes = attribute[1].trim().split(
          spaces_sep_by_comma,
        );

        for (const booleanAttribute of booleanAttributes) {
          const [attribute, maybeIdentifier] = booleanAttribute.split(":");
          const identifier = maybeIdentifier || attribute;
          const value = contextLookup(identifier);

          if (value) {
            attributes.push([attribute, ""]);
          }
        }
      } else if (attribute[0] === "@class") {
        // @class

        const identifier = attribute[1] || "class";
        const value = contextLookup(identifier);

        if (!value || typeof value !== "object") {
          throw new Error("@class should reference an object");
        }

        const classAttr = attributes.find(([k, _]) => k === "class");
        let classes = classAttr?.[1] ?? "";

        for (const [k, v] of Object.entries(value)) {
          if (v?.valueOf()) {
            classes += ` ${k} `;
          } else {
            for (const className of k.split(" ")) {
              classes.replace(className, "");
            }
          }
        }
        classes = classes.trim();

        if (classAttr) {
          classAttr[1] = classes;
        } else {
          attributes.push(["class", classes]);
        }
      } else if (attribute[0] === "@text") {
        // @text

        const identifier = attribute[1] || "text";
        const value = contextLookup(identifier);

        if (kind === Kind.VOID) {
          throw new Error(
            "Void elements can't have textContent",
          );
        }

        if (value !== null && value !== undefined) {
          textContent.text = `${value}`;
        }
      } else if (attribute[0] === "@html") {
        // @html

        const identifier = attribute[1] || "html";
        const value = contextLookup(identifier);

        if (kind === Kind.VOID) {
          throw new Error(
            "Void elements can't have innerHTML",
          );
        }

        if (value !== null && value !== undefined) {
          innerHTML.push(textNode(`${value}`));
        }
      }
    }

    if (kind === Kind.VOID || !children) {
      return { tagName, kind, attributes };
    }

    if (textContent.text === "" && innerHTML.length === 0) {
      innerHTML = await Promise.all(
        children.map((child) => applyServerEffects(child, manifest)),
      );
    }

    if (kind === Kind.CUSTOM && handlerStack.at(-1)?.tagName === tagName) {
      handlerStack.pop();
    }

    return {
      tagName,
      kind,
      attributes,
      children: textContent.text !== ""
        ? template.length ? [...template, textContent] : [textContent]
        : template.length
        ? [...template, ...innerHTML]
        : innerHTML,
    };
  }

  /**
   * Return the build order of a list of components, taking their relative dependencies into account
   */
  const sortComponents = <T extends ElementManifest | RouteManifest>(
    components: T[],
  ): T[] => {
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
  };

  return {
    name: "radish-plugin-kit",
    configResolved: (config) => {
      speculationRules = config?.speculationRules;
    },
    buildStart: (entries, manifest) => {
      const components: (ElementManifest | RouteManifest)[] = [];

      const byElementOrRoute = Object.groupBy(entries, (entry) => {
        if (entry.isFile && extname(entry.name) === ".html") {
          let isElementOrRoute: ElementManifest | RouteManifest | undefined;

          if (!relative(elementsFolder, entry.path).startsWith("..")) {
            const tagName = fileName(entry.name);
            isElementOrRoute = manifest.elements[tagName];
          } else if (!relative(routesFolder, entry.path).startsWith("..")) {
            isElementOrRoute = manifest.routes[dirname(entry.path)];
          }

          if (isElementOrRoute) {
            components.push(isElementOrRoute);
            return "_";
          }
          return "rest";
        }
        return "rest";
      });

      const sorted = sortComponents(components)
        .map((c) => {
          if (c.kind === "route") {
            return byElementOrRoute._?.find((entry) => entry.path === c.path);
          }

          return byElementOrRoute._?.find((entry) =>
            entry.path === c.files.find((f) => f.endsWith(".html"))
          );
        }).filter((p) => p !== undefined);

      return [...(byElementOrRoute?.rest ?? []), ...sorted];
    },
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
    manifest: (entry, { manifest, fileCache }) => {
      const extension = extname(entry.name);

      if (!entry.isFile || ![".html", ".js", ".ts"].includes(extension)) {
        return;
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
          return;
        }

        if (!elementName.includes("-")) {
          throw new Error(
            `An element file name must include a dash.\n\nIn: ${entry.path}`,
          );
        }

        const elementMetaData: ElementManifest =
          manifest.elements[elementName] ?? {
            kind: "element",
            tagName: elementName,
            path: parentFolder,
            files: [],
          };

        switch (extension) {
          case ".html":
            {
              elementMetaData.files.push(entry.path);

              let fragment;
              try {
                const content = fileCache.readTextFileSync(entry.path);
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
              const className = kebabToPascal(elementName);

              const importPath = join("..", entry.path);
              // @ts-ignore
              elementMetaData.classLoader = () =>
                `async () => {
              return (await import("${importPath}"))["${className}"];
            }`;

              elementMetaData.files.push(entry.path);
            }
            break;
        }

        manifest.elements[elementName] = elementMetaData;
      } else if (!relative(routesFolder, entry.path).startsWith("..")) {
        /**
         * Routes
         */

        if (extname(entry.name) === ".html") {
          let fragment;
          try {
            const content = fileCache.readTextFileSync(entry.path);
            fragment = fragments.parseOrThrow(content);
          } catch (error) {
            console.error(`Something went wrong while parsing ${entry.path}`);
            throw error;
          }

          if (entry.name === "_layout.html") {
            // Layout
            manifest.layouts[entry.path] = {
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
            manifest.routes[entry.path] = {
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
            const content = fileCache.readTextFileSync(entry.path);
            const imports = extractImports(content);

            manifest.elements[tagName] = {
              kind: "element",
              tagName,
              path: entry.path,
              files: [entry.path],
              imports,
              // @ts-ignore
              classLoader: () =>
                `async () => {return (await import("${
                  join("..", entry.path)
                }"))["${className}"];
              }`,
            };
          }
        }
      }
    },
    transform: async (_code, path, context) => {
      if (context.format !== ".html") return null;

      const manifest = context.manifest as Manifest;

      handlerStack = [];

      if (!relative(elementsFolder, path).startsWith("..")) {
        const element = manifest.elements[fileName(path)];

        if (!element?.templateLoader) return null;

        return serializeFragments(
          await Promise.all(
            element.templateLoader().map((f) =>
              applyServerEffects(f, manifest)
            ),
          ),
        );
      }

      const route = manifest.routes[dirname(path)];

      if (!route) return null;

      let pageHeadContent = `
    <script type="importmap">
      ${context.importmapController.importmap}
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
          manifest.elements[dependency];

        if (!element) return undefined;

        return element.files
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
            if (e.data === "reload") {
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

      const layouts = Object.values(manifest.layouts)
        .filter((layout) => {
          return is_parent_path_regex.test(
            dirname(relative(route.path, layout.path)),
          );
        });

      const pageFragments = layouts.map((layout) => layout.templateLoader());
      pageFragments.push(
        await Promise.all(
          route.templateLoader().map((f) => applyServerEffects(f, manifest)),
        ),
      );

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

      const pageContent = context.fileCache.readTextFileSync(appPath)
        .replace("%radish.head%", pageHeadContent)
        .replace("%radish.body%", pageBodyContent);

      return pageContent;
    },
    handleHotUpdate(event, context) {
      const extension = extname(event.path);
      const manifest = context.app.manifestController.manifest as Manifest;

      if (!event.isFile || ![".html", ".js", ".ts"].includes(extension)) {
        return null;
      }

      if (event.kind === "remove") {
        if (
          !relative(elementsFolder, event.path).startsWith("..")
        ) {
          const tagName = fileName(event.path);
          const element = manifest.elements[tagName];

          if (element) {
            if (element.files.length === 1) {
              delete manifest.elements[tagName];
            } else {
              element.files = element.files.filter((f) =>
                extname(f) !== extension
              );

              switch (extension) {
                case ".html":
                  delete element.templateLoader;
                  break;
                case ".js":
                case ".ts":
                  delete element.classLoader;
                  break;
              }
            }
          }
        } else if (!relative(routesFolder, event.path).startsWith("..")) {
          const route = manifest.routes[dirname(event.path)];

          if (route) {
            delete manifest.routes[dirname(event.path)];
          }
        }
      } else if (event.kind === "create" || event.kind === "modify") {
        this.manifest?.(
          {
            isDirectory: !event.isFile,
            isFile: event.isFile,
            isSymlink: false,
            path: event.path,
            name: basename(event.path),
          },
          {
            manifest: context.app.manifestController.manifest,
            fileCache: context.app.fileCache,
          },
        );
      }
    },
  };
};
