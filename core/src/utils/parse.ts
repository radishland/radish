/**
 * Extracts import specifiers from import declarations or dynamic imports
 */
export const import_regex =
  /from\s["']([^'"]+)["']|import\(["']([^"']+)["']\)/g;

/**
 * Returns the deduped array of (maybe dynamic) import specifiers from a js/ts
 * source file
 */
export const extractImports = (source: string) => {
  return Array.from(
    new Set(source.matchAll(import_regex).map((match) => match[1] || match[2])),
  ).filter((str) => str !== undefined);
};
