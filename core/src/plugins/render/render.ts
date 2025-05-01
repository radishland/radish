import {
  fragments,
  isCommentNode,
  isTextNode,
  Kind,
  type MFragment,
  type MNode,
  serializeFragments,
  shadowRoot,
} from "@radish/htmlcrunch";
import type { HandlerRegistry } from "@radish/runtime";
import {
  type AnyConstructor,
  assert,
  assertExists,
  assertObjectMatch,
  unreachable,
} from "@std/assert";
import type { WalkEntry } from "@std/fs";
import { basename, dirname, extname, join, relative } from "@std/path";
import { toPascalCase } from "@std/text";
import {
  elementsFolder,
  generatedFolder,
  routesFolder,
  ts_extension_regex,
} from "../../constants.ts";
import { buildPipeline } from "../../effects/build.ts";
import { config } from "../../effects/config.ts";
import { handlerFor } from "../../effects/effects.ts";
import { Handler } from "../../effects/handlers.ts";
import { hot } from "../../effects/hot-update.ts";
import { io } from "../../effects/io.ts";
import { manifest, manifestPath } from "../../effects/manifest.ts";
import { render } from "../../effects/render.ts";
import { dev } from "../../environment.ts";
import type { ManifestBase, Plugin } from "../../types.d.ts";
import { filename, isParent } from "../../utils/path.ts";
import { setScope } from "../../utils/stringify.ts";
import { dependencies } from "../../walk.ts";
import { updateManifest } from "../manifest.ts";

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

const manifestShape = {
  elements: {},
  imports: {},
  layouts: {},
  routes: {},
} satisfies Manifest;

const appPath = join(routesFolder, "_app.html");

let handlerStack: { tagName: string; instance: HandlerRegistry }[] = [];

export const contextLookup = (identifier: string) => {
  for (let i = handlerStack.length - 1; i >= 0; i--) {
    const instance = handlerStack[i]?.instance;
    if (instance && Object.hasOwn(instance, identifier)) {
      return instance.lookup(identifier)?.valueOf(); // runs the getter and returns the property or method value
    }
  }
};

/**
 * Transforms a node by performing directives, inserting templates etc.
 */
async function applyServerEffects(node: MNode): Promise<MNode> {
  await render.setCurrentNode(node);

  if (isCommentNode(node) || isTextNode(node)) return node;

  const { tagName, attributes, kind } = node;
  const _manifest = await manifest.get() as Manifest;
  assertObjectMatch(_manifest, manifestShape);

  let template: MNode[] = [];

  if (kind === Kind.CUSTOM) {
    const element: ElementManifest | undefined = _manifest.elements[tagName];
    if (element) {
      // component is a custom element
      if (element.classLoader) {
        const ElementClass = await element.classLoader();
        const instance = new ElementClass();

        handlerStack.push({ tagName, instance });
      }
      // component has a shadow root
      if (element.templateLoader) {
        template = await Promise.all(
          element.templateLoader().map(applyServerEffects),
        );
      }
    }
  }

  for (const [attrKey, attrValue] of attributes) {
    await render.directive(attrKey, attrValue);
  }

  if (kind === Kind.VOID) {
    return { tagName, kind, attributes };
  }

  let innerHTML: MFragment = [];

  if (node.children?.length) {
    innerHTML = await Promise.all(node.children.map(applyServerEffects));
  }

  if (kind === Kind.CUSTOM && handlerStack.at(-1)?.tagName === tagName) {
    handlerStack.pop();
  }

  return {
    tagName,
    kind,
    attributes,
    children: [...template, ...innerHTML],
  };
}

/**
 * Return the build order of a list of components, taking their relative dependencies into
 * account
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

export const pluginRender: Plugin = {
  name: "plugin-render",
  handlers: [
    /**
     * Decorator for the io/write handler
     *
     * Adds the required parser imports to the generated `manifest.ts` module
     */
    handlerFor(io.writeFile, (path, content) => {
      if (path !== manifestPath) return Handler.continue(path, content);

      content =
        `import { fragments, shadowRoot } from "@radish/core/parser";\n\n${content}`;

      return Handler.continue(path, content);
    }),
    handlerFor(buildPipeline.sortFiles, async (entries) => {
      const manifestObject = await manifest.get() as Manifest;
      assertObjectMatch(manifestObject, manifestShape);

      const otherEntries: WalkEntry[] = [];
      const elementsOrRoutes: (ElementManifest | RouteManifest)[] = [];
      const layouts: WalkEntry[] = [];

      for (const entry of entries) {
        if (entry.isFile && extname(entry.name) === ".html") {
          if (isParent(elementsFolder, entry.path)) {
            const tagName = filename(entry.name);
            const elementOrRoute = manifestObject.elements[tagName];

            if (elementOrRoute) {
              elementsOrRoutes.push(elementOrRoute);
            }

            elementsOrRoutes.push(
              ...Object.values(
                manifestObject.elements,
              ).filter((element) => element.dependencies?.includes(tagName)),
            );

            elementsOrRoutes.push(
              ...Object.values(
                manifestObject.routes,
              ).filter((element) => element.dependencies?.includes(tagName)),
            );
          } else if (isParent(routesFolder, entry.path)) {
            const route = manifestObject.routes[entry.path];
            if (route) {
              elementsOrRoutes.push(route);
              continue;
            }

            const layout = manifestObject.layouts[entry.path];
            if (layout) {
              layouts.push(entry);
              continue;
            }

            if (entry.path === appPath) {
              // _app.html will be handled first among html files
              layouts.unshift(entry);
              continue;
            }

            unreachable(`Entry not handled by sortFiled '${entry.path}'`);
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

      return [...otherEntries, ...layouts, ...sorted];
    }),
    handlerFor(manifest.update, async ({ entry, manifestObject }) => {
      manifestObject = Object.assign(
        manifestShape,
        manifestObject,
      ) satisfies Manifest;

      const extension = extname(entry.name);

      if (!entry.isFile || ![".html", ".js", ".ts"].includes(extension)) {
        return Handler.continue({ entry, manifestObject });
      }

      if (isParent(elementsFolder, entry.path)) {
        /**
         * Elements
         */

        const parentFolder = basename(dirname(entry.path));
        const elementName = filename(entry.name);

        if (parentFolder !== elementName) {
          console.warn(
            `By convention an element file has the same name as its parent folder. Skipping file ${entry.path}`,
          );
          return Handler.continue({ entry, manifestObject });
        }

        assert(
          elementName.includes("-"),
          `An element file name must include a dash.\n\nIn: ${entry.path}`,
        );

        const elementMetaData: ElementManifest =
          manifestObject.elements[elementName] ?? {
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
                const content = await io.readFile(entry.path);
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
              setScope(elementMetaData.templateLoader, { path });
            }
            break;

          case ".js":
          case ".ts":
            {
              const className = toPascalCase(elementName);
              const importPath = relative(generatedFolder, entry.path);

              elementMetaData.classLoader = async () => {
                return (await import(importPath))[className];
              };
              setScope(elementMetaData.classLoader, {
                importPath,
                className,
              });

              if (!elementMetaData.files.includes(entry.path)) {
                elementMetaData.files.push(entry.path);
              }
            }
            break;
        }

        manifestObject.elements[elementName] = elementMetaData;
      } else if (isParent(routesFolder, entry.path)) {
        /**
         * Routes
         */

        if (extname(entry.name) === ".html") {
          let fragment;
          try {
            const content = await io.readFile(entry.path);
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
          setScope(templateLoader, { path });

          if (entry.name === "_layout.html") {
            // Layout

            manifestObject.layouts[path] = {
              kind: "layout",
              path: path,
              dependencies: dependencies(fragment),
              templateLoader,
            };
          } else if (entry.name === "index.html") {
            // Route
            manifestObject.routes[path] = {
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
            const tagName = filename(entry.path);
            const className = toPascalCase(tagName);
            const importPath = relative(generatedFolder, entry.path);

            const classLoader = async () => {
              return (await import(importPath))[className];
            };
            setScope(classLoader, { importPath, className });

            manifestObject.elements[tagName] = {
              kind: "element",
              tagName,
              path: entry.path,
              files: [entry.path],
              classLoader,
            };
          }
        }
      }
      return Handler.continue({ entry, manifestObject });
    }),
    handlerFor(io.transformFile, async ({ path, content }) => {
      if (extname(path) !== ".html") return Handler.continue({ path, content });

      const manifestObject = await manifest.get() as Manifest;
      assertObjectMatch(manifestObject, manifestShape);

      handlerStack = [];

      if (isParent(elementsFolder, path)) {
        const element = manifestObject.elements[filename(path)];

        if (!element?.templateLoader) {
          return Handler.continue({ path, content });
        }

        return Handler.continue({
          path,
          content: serializeFragments(
            await Promise.all(element.templateLoader().map(applyServerEffects)),
          ),
        });
      }

      const route = manifestObject.routes[path];

      if (!route) return Handler.continue({ path, content });

      let pageHeadContent = "";

      const { speculationRules } = await config.read();

      if (speculationRules) {
        pageHeadContent += `
      <script type="speculationrules">
        ${JSON.stringify(speculationRules)}
      </script>`;
      }

      // Auto-import custom element modules
      const imports = route.dependencies.toReversed().map((dependency) => {
        const element: ElementManifest | undefined =
          manifestObject.elements[dependency];

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
      if (dev) {
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

      const layouts: LayoutManifest[] = Object.values(manifestObject.layouts)
        .filter((layout) => isParent(dirname(layout.path), route.path));

      const pageFragments = layouts.map((layout) => layout.templateLoader());
      pageFragments.push(
        await Promise.all(route.templateLoader().map(applyServerEffects)),
      );

      const pageGroups = Object.groupBy(
        pageFragments.flat(),
        (node) => {
          if (node.kind === "NORMAL" && node.tagName === "head") {
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
          removeComments: !dev,
        });
      }

      let pageBodyContent = "";
      if (pageGroups.body) {
        pageBodyContent = serializeFragments(pageGroups.body, {
          removeComments: !dev,
        });
      }

      const appSkeletonPath = await io.emitTo(appPath);
      const appSkeleton = await io.readFile(appSkeletonPath);

      return Handler.continue({
        path,
        content: appSkeleton
          .replace("%radish.head%", pageHeadContent)
          .replace("%radish.body%", pageBodyContent),
      });
    }),
    handlerFor(hot.update, async ({ event, paths }) => {
      const extension = extname(event.path);
      const manifestObject = await manifest.get() as Manifest;
      assertObjectMatch(manifestObject, manifestShape);

      if (!event.isFile || ![".html", ".js", ".ts"].includes(extension)) {
        return Handler.continue({ event, paths });
      }

      if (event.kind === "remove") {
        if (isParent(elementsFolder, event.path)) {
          const tagName = filename(event.path);
          const element = manifestObject.elements[tagName];

          if (element) {
            if (element.files.length === 1) {
              delete manifestObject.elements[tagName];
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
        } else if (isParent(routesFolder, event.path)) {
          const route = manifestObject.routes[event.path];

          if (route) {
            delete manifestObject.routes[event.path];
          }
        }
      } else if (event.kind === "create" || event.kind === "modify") {
        await updateManifest(event.path);
      }
      return Handler.continue({ event, paths });
    }),
  ],
};
