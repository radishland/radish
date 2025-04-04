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
import type { HandlerRegistry } from "@radish/runtime";
import { bindingConfig, spaces_sep_by_comma } from "@radish/runtime/utils";
import {
  type AnyConstructor,
  assert,
  assertArrayIncludes,
  assertExists,
  assertObjectMatch,
} from "@std/assert";
import type { WalkEntry } from "@std/fs/walk";
import { basename, dirname, extname, join, relative } from "@std/path";
import { toPascalCase } from "@std/text";
import {
  buildFolder,
  elementsFolder,
  routesFolder,
  ts_extension_regex,
} from "./constants.ts";
import type { SpeculationRules } from "./generate/speculationrules.ts";
import type { ManifestBase, Plugin } from "./types.d.ts";
import { fileName, throwUnlessNotFound } from "./utils.ts";
import { dependencies } from "./walk.ts";

export const SCOPE = Symbol.for("scope");

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
        throwUnlessNotFound(error);
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

export type ElementManifest = {
  kind: "element";
  tagName: string;
  path: string;
  files: string[];
  classLoader?: () => Promise<AnyConstructor>;
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
 * Built-in plugin
 *
 * Invalidates the file cache when a file is modified or removed
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
      plugins: [
        pluginCacheInvalidation,
        pluginImports,
        ...(userConfig.plugins ?? []),
      ],
    };
  },
};

/**
 * Extracts import specifiers from import declarations or dynamic imports
 */
const import_regex = /from\s["']([^'"]+)["']|import\(["']([^"']+)["']\)/g;

/**
 * Returns the deduped array of import aliases
 */
const extractImports = (source: string) => {
  return Array.from(
    new Set(source.matchAll(import_regex).map((match) => match[1] || match[2])),
  ).filter((str) => str !== undefined);
};

/**
 * Built-in plugin
 *
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
  const manifestShape = {
    elements: {},
    imports: {},
    layouts: {},
    routes: {},
  } satisfies Manifest;

  let speculationRules: SpeculationRules | undefined;
  let handlerStack: { tagName: string; instance: HandlerRegistry }[] = [];

  const contextLookup = (identifier: string) => {
    for (let i = handlerStack.length - 1; i >= 0; i--) {
      const instance = handlerStack[i]?.instance;
      if (instance && Object.hasOwn(instance, identifier)) {
        return instance.lookup(identifier)?.valueOf(); // runs the getter and returns the property or method value
      }
    }
  };

  const setAttribute = (
    attributes: [string, string][],
    attribute: string,
    value: unknown,
  ) => {
    assertArrayIncludes(
      ["string", "number", "boolean"],
      [typeof value],
      "Can only set primitive values as attributes",
    );

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

          if (!identifier) {
            console.warn("Missing @attr identifier");
            continue;
          }

          if (!attribute) {
            console.warn("Missing @attr attribute");
            continue;
          }

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

        assert(
          Object.keys(bindingConfig).includes(property),
          `${property} is not bindable`,
        );

        const identifier = attribute[1] || property;
        const value = contextLookup(identifier);

        assert(
          bindingConfig[property].type.includes(typeof value),
          `@bind:${property}=${identifier} should reference a value of type ${
            bindingConfig[property].type.join("|")
          } and "${identifier}" has type ${typeof value}`,
        );

        setAttribute(attributes, property, value);
      } else if (attribute[0] === "@bool") {
        // @bool

        const booleanAttributes = attribute[1].trim().split(
          spaces_sep_by_comma,
        );

        for (const booleanAttribute of booleanAttributes) {
          const [attribute, maybeIdentifier] = booleanAttribute.split(":");
          const identifier = maybeIdentifier || attribute;

          if (!identifier) {
            console.warn("Missing @attr identifier");
            continue;
          }

          if (!attribute) {
            console.warn("Missing @attr attribute");
            continue;
          }

          const value = contextLookup(identifier);

          if (value) {
            attributes.push([attribute, ""]);
          }
        }
      } else if (attribute[0] === "@class") {
        // @class

        const identifier = attribute[1] || "class";
        const value = contextLookup(identifier);

        assert(typeof value === "object", "@class should reference an object");

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

        assert(kind !== Kind.VOID, "Void elements can't have textContent");

        if (value !== null && value !== undefined) {
          textContent.text = `${value}`;
        }
      } else if (attribute[0] === "@html") {
        // @html

        const identifier = attribute[1] || "html";
        const value = contextLookup(identifier);

        assert(kind !== Kind.VOID, "Void elements can't have innerHTML");

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
      // Find the leafs
      // TODO restrict the search of leafs to paths and names in the `components` array
      const { leafNodes, interiorNodes } = Object.groupBy(components, (c) => {
        return c.dependencies?.every((d) => ids.has(d))
          ? "leafNodes"
          : "interiorNodes";
      });

      if (leafNodes) {
        sorted = sorted.concat(leafNodes);

        for (const leave of leafNodes) {
          if ("tagName" in leave) {
            ids.add(leave.tagName);
          }
        }
      }

      if (interiorNodes) {
        // Update remaining components
        components = interiorNodes;
      } else {
        components = [];
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
    buildOrder: (entries, manifest) => {
      const otherEntries: WalkEntry[] = [];
      const elementsOrRoutes: (ElementManifest | RouteManifest)[] = [];

      assertObjectMatch(manifest, manifestShape);

      for (const entry of entries) {
        if (entry.isFile && extname(entry.name) === ".html") {
          if (!relative(elementsFolder, entry.path).startsWith("..")) {
            const tagName = fileName(entry.name);
            const elementOrRoute = manifest.elements[tagName];

            if (elementOrRoute) {
              elementsOrRoutes.push(elementOrRoute);
            }

            if (manifest.elements && manifest.routes) {
              elementsOrRoutes.push(
                ...Object.values(
                  (manifest as Manifest).elements,
                ).filter((element) => element.dependencies?.includes(tagName)),
              );

              elementsOrRoutes.push(
                ...Object.values(
                  (manifest as Manifest).routes,
                ).filter((element) => element.dependencies?.includes(tagName)),
              );
            }
          } else if (!relative(routesFolder, entry.path).startsWith("..")) {
            const route = manifest.routes[entry.path];
            if (route) {
              elementsOrRoutes.push(route);
            }
          } else {
            otherEntries.push(entry);
          }
        } else {
          otherEntries.push(entry);
        }
      }

      const sorted = sortComponents(Array.from(new Set(elementsOrRoutes)))
        .map((c) => {
          const path = c.files.find((f) => f.endsWith(".html"));
          assertExists(path);

          return {
            isDirectory: false,
            isFile: true,
            isSymlink: false,
            name: basename(c.path),
            path,
          } satisfies WalkEntry;
        });

      return [...otherEntries, ...sorted];
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

        assert(
          elementName.includes("-"),
          `An element file name must include a dash.\n\nIn: ${entry.path}`,
        );

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
              if (!elementMetaData.files.includes(entry.path)) {
                elementMetaData.files.push(entry.path);
              }

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

              const path = entry.path;
              elementMetaData.templateLoader = () => {
                return shadowRoot.parseOrThrow(
                  Deno.readTextFileSync(path),
                );
              };
              Object.defineProperty(elementMetaData.templateLoader, SCOPE, {
                value: { path },
              });
            }
            break;

          case ".js":
          case ".ts":
            {
              const className = toPascalCase(elementName);
              const importPath = join("..", entry.path);

              elementMetaData.classLoader = async () => {
                return (await import(importPath))[className];
              };

              Object.defineProperty(elementMetaData.classLoader, SCOPE, {
                value: { importPath, className },
              });

              if (!elementMetaData.files.includes(entry.path)) {
                elementMetaData.files.push(entry.path);
              }
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

          const path = entry.path;
          const templateLoader = () => {
            return fragments.parseOrThrow(
              Deno.readTextFileSync(path),
            );
          };
          Object.defineProperty(templateLoader, SCOPE, {
            value: { path },
          });

          if (entry.name === "_layout.html") {
            // Layout

            manifest.layouts[path] = {
              kind: "layout",
              path: path,
              dependencies: dependencies(fragment),
              templateLoader,
            };
          } else if (entry.name === "index.html") {
            // Route
            manifest.routes[path] = {
              kind: "route",
              path: path,
              files: [path],
              templateLoader,
              dependencies: dependencies(fragment),
            };
          }
        } else {
          // The extension is .js or .ts

          if (entry.name.includes("-")) {
            const tagName = fileName(entry.path);
            const content = fileCache.readTextFileSync(entry.path);
            const imports = extractImports(content);

            const className = toPascalCase(tagName);
            const importPath = join("..", entry.path);

            const classLoader = async () => {
              return (await import(importPath))[className];
            };

            Object.defineProperty(classLoader, SCOPE, {
              value: { importPath, className },
            });

            manifest.elements[tagName] = {
              kind: "element",
              tagName,
              path: entry.path,
              files: [entry.path],
              imports,
              classLoader,
            };
          }
        }
      }
    },
    transform: async (_code, path, context) => {
      if (context.format !== ".html") return null;

      const manifest = context.manifest as Manifest;
      assertObjectMatch(manifest, manifestShape);

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

      const route = manifest.routes[path];

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
      assertObjectMatch(manifest, manifestShape);

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
          const route = manifest.routes[event.path];

          if (route) {
            delete manifest.routes[event.path];
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
