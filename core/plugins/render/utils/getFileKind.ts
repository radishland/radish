import { SEPARATOR } from "@std/path";
import { elementsFolder, libFolder, routesFolder } from "$lib/conventions.ts";

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

  if (segments.includes(elementsFolder)) return "element";
  if (segments.includes(routesFolder)) return "route";
  if (segments.includes(libFolder)) return "lib";
  return "unknown";
};
