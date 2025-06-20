import { build } from "$effects/build.ts";
import { manifest } from "$effects/manifest.ts";
import type {
  ElementManifest,
  Manifest,
  RouteManifest,
} from "$effects/render.ts";
import { appPath } from "$lib/conventions.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { assertExists, assertObjectMatch, unreachable } from "@std/assert";
import type { WalkEntry } from "@std/fs";
import { extname } from "@std/path";
import { createWalkEntry } from "../../../utils/fs.ts";
import { filename } from "../../../utils/path.ts";
import { getFileKind } from "../utils/getFileKind.ts";
import { manifestShape } from "./manifest/mod.ts";

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

/**
 * @hooks
 * - `build/sort`
 *
 * @performs
 * - `manifest/get`
 */
export const handleSort = handlerFor(
  build.sort,
  async (entries) => {
    const manifestObject = await manifest.get() as Manifest;
    assertObjectMatch(manifestObject, manifestShape);

    const otherEntries: WalkEntry[] = [];
    const elementsOrRoutes: (ElementManifest | RouteManifest)[] = [];
    const layouts: WalkEntry[] = [];

    for (const entry of entries) {
      const fileKind = getFileKind(entry.path);

      if (extname(entry.name) === ".html") {
        if (fileKind === "element") {
          const tagName = filename(entry.name);
          const elementOrRoute = manifestObject.elements[tagName];

          if (elementOrRoute) {
            elementsOrRoutes.push(elementOrRoute);
          }

          const dependantElements = Object.values(
            manifestObject.elements,
          ).filter((element) => element.dependencies?.includes(tagName));
          elementsOrRoutes.push(...dependantElements);

          const dependantRoutes = Object.values(
            manifestObject.routes,
          ).filter((element) => element.dependencies?.includes(tagName));
          elementsOrRoutes.push(...dependantRoutes);
        } else if (fileKind === "route") {
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

          unreachable(`Entry not handled by sortFile '${entry.path}'`);
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

        return createWalkEntry(path);
      });

    return Handler.continue([...otherEntries, ...layouts, ...sorted]);
  },
);
