import { io } from "$effects/io.ts";
import { manifest } from "$effects/manifest.ts";
import type {
  ElementManifest,
  LayoutManifest,
  RouteManifest,
} from "$effects/render.ts";
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
import { filename, isParent } from "../../../../utils/path.ts";
import { dependencies } from "../../utils/walk.ts";

/**
 * The `manifest/update` hook used by the render plugin to extend the manifest with data about elements, routes, layouts etc.
 *
 * @hooks
 * - `manifest/update`
 *
 * @performs
 * - `io/read`
 */
export const handleManifestUpdateRenderHook = handlerFor(
  manifest.update,
  async (entry) => {
    const manifestObject = await manifest.get();
    const extension = extname(entry.name);

    if (!entry.isFile || ![".html", ".js", ".ts"].includes(extension)) {
      return Handler.continue(entry);
    }

    if (isParent(elementsFolder, entry.path)) {
      /**
       * Elements
       */

      const parentFolder = dirname(entry.path);
      const elementName = filename(entry.name);

      if (basename(parentFolder) !== elementName) {
        console.warn(
          `By convention an element file has the same name as its parent folder. Skipping file ${entry.path}`,
        );
        return Handler.continue(entry);
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
            elementMetaData.templatePath = path;
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

        if (entry.name === "_layout.html") {
          // Layout

          manifestObject.layouts[path] = {
            kind: "layout",
            path: path,
            dependencies: dependencies(fragment),
            templatePath: path,
          } satisfies LayoutManifest;
        } else if (entry.name === "index.html") {
          // Route
          manifestObject.routes[path] = {
            kind: "route",
            path: path,
            files: [path],
            dependencies: dependencies(fragment),
            templatePath: path,
          } satisfies RouteManifest;
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
    return Handler.continue(entry);
  },
);
