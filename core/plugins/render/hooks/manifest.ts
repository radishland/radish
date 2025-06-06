import { io } from "$effects/io.ts";
import { manifest, manifestPath } from "$effects/manifest.ts";
import type { ElementManifest, Manifest } from "$effects/render.ts";
import {
  elementsFolder,
  generatedFolder,
  routesFolder,
} from "$lib/conventions.ts";
import { setScope } from "$lib/utils/stringify.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { fragments, shadowRoot } from "@radish/htmlcrunch";
import { assert } from "@std/assert";
import { basename, dirname, extname, relative } from "@std/path";
import { toPascalCase } from "@std/text";
import { filename, isParent } from "../../../utils/path.ts";
import { dependencies } from "../utils/walk.ts";

export const manifestShape = {
  elements: {},
  imports: {},
  layouts: {},
  routes: {},
} satisfies Manifest;

/**
 * @hooks
 * - `io/write` Inserts parser imports in the generated manifest module
 * - `manifest/update`
 *
 * @performs
 * - `io/read`
 */
export const handleManifest = [
  /**
   * Decorator for the io/write handler
   *
   * Adds the required parser imports to the generated `manifest.ts` module
   */
  handlerFor(io.write, (path, content) => {
    if (path !== manifestPath) return Handler.continue(path, content);

    content =
      `import { fragments, shadowRoot } from "@radish/core/parser";\n\n${content}`;

    return Handler.continue(path, content);
  }),
  handlerFor(
    manifest.update,
    async ({ entry, manifestObject }) => {
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
                const content = await io.read(entry.path);
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
            const content = await io.read(entry.path);
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
    },
  ),
];
