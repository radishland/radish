import { elementsFolder, libFolder, routesFolder } from "$lib/conventions.ts";
import { unreachable } from "@std/assert";
import { SEPARATOR } from "@std/path";

export type FileKind = "element" | "route" | "lib" | "unknown";

/**
 * Determines the kind of a file based on its path.
 * - Returns 'route' if the file is under the routes folder
 * - Returns 'element' if under the elements folder
 * - Returns 'lib' if under the lib folder
 * - Returns 'unknown' otherwise
 */
export const getFileKind = (path: string): FileKind => {
  const segments = path.split(SEPARATOR);

  const kind = new Set(
    segments.filter((s) =>
      s === elementsFolder || s === routesFolder || s === libFolder
    ),
  );

  if (kind.size !== 1) return "unknown";

  switch (Array.from(kind).at(0)) {
    case "elements":
      return "element";
    case "routes":
      return "route";
    case "lib":
      return "lib";
    default:
      unreachable();
  }
};
