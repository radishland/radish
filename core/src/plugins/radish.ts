import { dev } from "$env";
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
import type { WalkEntry } from "@std/fs";
import { basename, dirname, extname, join, relative } from "@std/path";
import { toPascalCase } from "@std/text";
import {
  elementsFolder,
  routesFolder,
  ts_extension_regex,
} from "../constants.ts";
import { buildPipeline } from "../effects/build.ts";
import { config } from "../effects/config.ts";
import { transformerFor } from "../effects/effects.ts";
import { hot } from "../effects/hot-update.ts";
import { importmap } from "../effects/impormap.ts";
import { io } from "../effects/io.ts";
import { manifest } from "../effects/manifest.ts";
import type { ManifestBase, Plugin } from "../types.d.ts";
import { Option } from "../utils/algebraic-structures.ts";
import { filename } from "../utils/path.ts";
import { setScope } from "../utils/stringify.ts";
import { dependencies } from "../walk.ts";
import { updateManifest } from "./manifest.ts";

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
    name: "plugin-radish",
    // manifestStart: (controller) => {
    //   controller.manifestImports
    //     .add('import { fragments, shadowRoot } from "$core/parser";');
    // },
    transformers: [
      transformerFor(buildPipeline.sortFiles, async (entries) => {
        const manifestObject = await manifest.get() as Manifest;
        assertObjectMatch(manifestObject, manifestShape);

        const otherEntries: WalkEntry[] = [];
        const elementsOrRoutes: (ElementManifest | RouteManifest)[] = [];

        for (const entry of entries) {
          if (entry.isFile && extname(entry.name) === ".html") {
            if (!relative(elementsFolder, entry.path).startsWith("..")) {
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
            } else if (!relative(routesFolder, entry.path).startsWith("..")) {
              const route = manifestObject.routes[entry.path];
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
      }),
      transformerFor(manifest.update, async ({ entry, manifestObject }) => {
        manifestObject = Object.assign({
          elements: {},
          routes: {},
          layouts: {},
        }, manifestObject) satisfies Manifest;

        const extension = extname(entry.name);

        if (!entry.isFile || ![".html", ".js", ".ts"].includes(extension)) {
          return Option.none();
        }

        if (!relative(elementsFolder, entry.path).startsWith("..")) {
          /**
           * Elements
           */

          const parentFolder = basename(dirname(entry.path));
          const elementName = filename(entry.name);

          if (parentFolder !== elementName) {
            console.warn(
              `By convention an element file has the same name as its parent folder. Skipping file ${entry.path}`,
            );
            return Option.none();
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
                const importPath = join("..", entry.path);

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
        } else if (!relative(routesFolder, entry.path).startsWith("..")) {
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
              const importPath = join("..", entry.path);

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
        return Option.none();
      }),
      transformerFor(io.transformFile, async ({ path }) => {
        if (extname(path) !== ".html") return Option.none();

        const manifestObject = await manifest.get() as Manifest;
        assertObjectMatch(manifestObject, manifestShape);

        handlerStack = [];

        if (!relative(elementsFolder, path).startsWith("..")) {
          const element = manifestObject.elements[filename(path)];

          if (!element?.templateLoader) return Option.none();

          return Option.some({
            path,
            content: serializeFragments(
              await Promise.all(
                element.templateLoader().map((f) =>
                  applyServerEffects(f, manifestObject)
                ),
              ),
            ),
          });
        }

        const route = manifestObject.routes[path];

        if (!route) return Option.none();

        let pageHeadContent = `
      <script type="importmap">
        ${JSON.stringify(await importmap.get())}
      </script>`;

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

        const layouts = Object.values(manifestObject.layouts)
          .filter((layout) => {
            return is_parent_path_regex.test(
              dirname(relative(route.path, layout.path)),
            );
          });

        const pageFragments = layouts.map((layout) => layout.templateLoader());
        pageFragments.push(
          await Promise.all(
            route.templateLoader().map((f) =>
              applyServerEffects(f, manifestObject)
            ),
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

        const pageContent = await io.readFile(appPath);

        return {
          path,
          content: pageContent
            .replace("%radish.head%", pageHeadContent)
            .replace("%radish.body%", pageBodyContent),
        };
      }),

      transformerFor(hot.update, async ({ event }) => {
        const extension = extname(event.path);
        const manifestObject = await manifest.get() as Manifest;
        assertObjectMatch(manifestObject, manifestShape);

        if (!event.isFile || ![".html", ".js", ".ts"].includes(extension)) {
          return Option.none();
        }

        if (event.kind === "remove") {
          if (
            !relative(elementsFolder, event.path).startsWith("..")
          ) {
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
          } else if (!relative(routesFolder, event.path).startsWith("..")) {
            const route = manifestObject.routes[event.path];

            if (route) {
              delete manifestObject.routes[event.path];
            }
          }
        } else if (event.kind === "create" || event.kind === "modify") {
          await updateManifest(event.path);
        }
        return Option.none();
      }),
    ],
  };
};
