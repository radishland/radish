import { ensureDirSync, walk } from "@std/fs";
import { join } from "@std/path";
import { buildFolder, generatedFolder } from "./constants.ts";

const size_regex =
  /var\(--(?<size100>\d)(?<size010>\d)(?<size001>\d)(?<unit>r?em)?\)/g;

/**
 * The map of all CSS variables for sizes used in the code, and their computed value
 */
const CSSVarSizesMap = new Map<string, string>();

const computeSize = (
  size100: number,
  size010: number,
  size001: number,
  unit: string | undefined,
) => {
  const computedValue = Math.pow(1.5, size100 + size010 / 3 + size001 / 9);
  return `${Math.round(computedValue * 1000) / 1000}${unit ?? ""}`;
};

/**
 * Extracts the used CSS sizes from a string of html or css
 */
const extractCSSVars = (code: string) => {
  const sizes = code.matchAll(size_regex);

  for (const size of sizes) {
    if (!size?.groups || CSSVarSizesMap.has(size[0])) continue;

    const { size100, size010, size001, unit } = size.groups;

    CSSVarSizesMap.set(
      `--${size100}${size010}${size001}${unit ?? ""}`,
      computeSize(+size100, +size010, +size001, unit),
    );
  }

  return code;
};

export const generateCSS = async () => {
  // Extract the css variables from source files
  for await (
    const entry of walk("app", {
      exts: [".html", ".css"],
      includeSymlinks: false,
    })
  ) {
    const code = await Deno.readTextFile(entry.path);
    extractCSSVars(code);
  }

  // Generate the stylesheet
  let css = ":root {\n";
  for (const [k, v] of Array.from(CSSVarSizesMap.entries()).sort()) {
    css += `\t${k}: ${v};\n`;
  }
  css += "}";

  ensureDirSync(generatedFolder);
  ensureDirSync(join(buildFolder, generatedFolder));

  await Deno.writeTextFile(
    join(generatedFolder, "variables.css"),
    css,
  );
  await Deno.writeTextFile(
    join(buildFolder, generatedFolder, "variables.css"),
    css,
  );
};
