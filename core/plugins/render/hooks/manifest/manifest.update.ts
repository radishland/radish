import { fs } from "$effects/fs.ts";
import { manifest } from "$effects/manifest.ts";
import type {
  ElementManifest,
  LayoutManifest,
  RouteManifest,
} from "$effects/render.ts";
import { generatedFolder } from "$lib/conventions.ts";
import { setScope } from "$lib/utils/stringify.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { fragments, shadowRoot } from "@radish/htmlcrunch";
import { assert } from "@std/assert";
import { basename, dirname, extname, relative } from "@std/path";
import { toPascalCase } from "@std/text";
import { filename } from "../../../../utils/path.ts";
import { getFileKind } from "../../utils/getFileKind.ts";
import { dependencies } from "../../utils/walk.ts";

/**
 * The `manifest/update` hook used by the render plugin to extend the manifest with data about elements, routes, layouts etc.
 *
 * @hooks
 * - `manifest/update`
 *
 * @performs
 * - `fs/read`
 */
export const handleManifestUpdateRenderHook = handlerFor(
  manifest.updateEntry,
  async (entry) => {
    const manifestObject = await manifest.get();
    const extension = extname(entry.name);
    const path = entry.path;

    if (!entry.isFile || ![".html", ".js", ".ts"].includes(extension)) {
      return Handler.continue(entry);
    }
    const fileKind = getFileKind(path);

    if (fileKind === "element") {
      /**
       * Elements
       */

      const parentFolder = dirname(path);
      const elementName = filename(entry.name);

      if (basename(parentFolder) !== elementName) {
        console.warn(
          `By convention an element file has the same name as its parent folder. Skipping file ${path}`,
        );
        return Handler.continue(entry);
      }

      assert(
        elementName.includes("-"),
        `An element file name must include a dash.\n\nIn: ${path}`,
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
            if (!elementMetaData.files.includes(path)) {
              elementMetaData.files.push(path);
            }

            let fragment;
            try {
              const content = await fs.read(path);
              fragment = shadowRoot.parseOrThrow(content);
            } catch (error) {
              console.error(
                `Something went wrong while parsing ${path}`,
              );
              throw error;
            }

            elementMetaData.dependencies = dependencies(fragment);
            elementMetaData.templatePath = path;
          }
          break;

        case ".js":
        case ".ts":
          {
            const className = toPascalCase(elementName);
            const importPath = relative(generatedFolder, path);

            elementMetaData.classLoader = async () => {
              return (await import(importPath))[className];
            };
            setScope(elementMetaData.classLoader, {
              importPath,
              className,
            });

            if (!elementMetaData.files.includes(path)) {
              elementMetaData.files.push(path);
            }
          }
          break;
      }

      manifestObject.elements[elementName] = elementMetaData;
    } else if (fileKind === "route" || fileKind === "layout") {
      /**
       * Routes
       */

      if (extname(entry.name) === ".html") {
        let fragment;
        try {
          const content = await fs.read(path);
          fragment = fragments.parseOrThrow(content);
        } catch (error) {
          console.error(`Something went wrong while parsing ${path}`);
          throw error;
        }

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
          const tagName = filename(path);
          const className = toPascalCase(tagName);
          const importPath = relative(generatedFolder, path);

          const classLoader = async () => {
            return (await import(importPath))[className];
          };
          setScope(classLoader, { importPath, className });

          manifestObject.elements[tagName] = {
            kind: "element",
            tagName,
            path: path,
            files: [path],
            classLoader,
          };
        }
      }
    }
    return Handler.continue(entry);
  },
);
