import {
  fragments,
  Kind,
  type MFragment,
  shadowRoot,
} from "@radish/htmlcrunch";
import { ensureDirSync, walkSync } from "@std/fs";
import { extname, join } from "@std/path";
import { elementsFolder, generatedFolder, routesFolder } from "../constants.ts";
import { kebabToPascal } from "../utils.ts";
import { walkTree } from "../walk.ts";

type Constructor<T = any> = new (...args: any[]) => T;

export type ElementManifest =
  | {
    kind: "custom-element";
    tagName: string;
    path: string;
    files: string[];
    class: Constructor;
    dependencies: string[];
    templateLoader?: never;
    imports: string[];
  }
  | {
    kind: "web-component";
    tagName: string;
    path: string;
    files: string[];
    class: Constructor;
    templateLoader: () => MFragment;
    dependencies: string[];
    imports: string[];
  }
  | {
    kind: "unknown-element";
    tagName: string;
    path: string;
    files: string[];
    class?: never;
    templateLoader: () => MFragment;
    dependencies: string[];
    imports?: never;
  };

export type RouteManifest = {
  kind: "route";
  path: string;
  files: string[];
  templateLoader: () => MFragment;
  dependencies: string[];
  layouts: LayoutManifest[];
};

export type LayoutManifest = {
  kind: "layout";
  path: string;
  templateLoader: () => MFragment;
  dependencies: string[];
};

export type Manifest = {
  elements: Record<string, ElementManifest>;
  routes: Record<string, RouteManifest>;
};

export const manifest: Manifest = { elements: {}, routes: {} };

let classImports = "";
let elementsManifest = "";
let routesManifest = "";

const import_regex = /from\s["']([^'"]+)["']|import\(["']([^"']+)["']\)/g;
const extractImports = (source: string) => {
  return Array.from(source.matchAll(import_regex), (match) => match[1]);
};

const crawlElementsFolder = () => {
  for (
    const entry of Array.from(walkSync(elementsFolder, {
      includeSymlinks: false,
      includeDirs: true,
      includeFiles: false,
    }))
  ) {
    const files = Array.from(
      walkSync(entry.path, {
        exts: [".html", ".js", ".ts"],
        maxDepth: 1,
        includeDirs: false,
        includeSymlinks: false,
      }),
    );

    if (!files.length) continue;

    const elementName = entry.name;

    if (!elementName.includes("-")) {
      throw new Error(
        `A custom element name must include a dash.\n\nIn: ${entry.path}`,
      );
    }

    const elementMetaData = {
      kind: "",
      tagName: elementName,
      path: entry.path,
      files: [] as string[],
      class: "undefined",
      templateLoader: "undefined",
      dependencies: [] as string[],
      imports: undefined as undefined | string[],
    };
    const className = kebabToPascal(elementName);

    let hasShadowRootTemplate = false;
    let isCustomElement = false;

    for (const file of files) {
      switch (extname(file.name)) {
        case ".html":
          // a shadow root template is an .html descendant of the elements folder, with the same name than its parent folder
          hasShadowRootTemplate = entry.name + ".html" === file.name;
          elementMetaData.files.push(file.path);

          if (hasShadowRootTemplate) {
            const content = Deno.readTextFileSync(file.path);

            let fragment;
            try {
              fragment = shadowRoot.parseOrThrow(content);
            } catch (error) {
              console.error(
                `Something went wrong while parsing ${file.path}`,
              );
              throw error;
            }

            // Collect dependencies
            const dependencySet = new Set<string>();
            for (const element of fragment) {
              walkTree(element, (node) => {
                if (node.kind === Kind.CUSTOM) {
                  dependencySet.add(node.tagName);
                }
              });
            }

            elementMetaData.dependencies = Array.from(dependencySet);
            elementMetaData.templateLoader = `memoize(() => {
              return shadowRoot.parseOrThrow(Deno.readTextFileSync("${file.path}"));
              })`;
          }
          break;

        case ".js":
        case ".ts":
          if (entry.name + extname(file.name) === file.name) {
            const content = Deno.readTextFileSync(file.path);
            const imports = extractImports(content);

            isCustomElement = true;
            classImports += `import { ${className} } from "${
              join("..", file.path)
            }";\n`;

            elementMetaData.class = `${className}`;
            elementMetaData.files.push(file.path);
            elementMetaData.imports = imports;
          }
          break;
      }
    }

    elementMetaData.kind = isCustomElement
      ? hasShadowRootTemplate ? "web-component" : "custom-element"
      : "unknown-element";

    elementsManifest += `"${elementMetaData.tagName}": {
      kind: "${elementMetaData.kind}",
      tagName: "${elementMetaData.tagName}",
      path: "${elementMetaData.path}",
      files: ${JSON.stringify(elementMetaData.files)},
      class: ${elementMetaData.class},
      templateLoader: ${elementMetaData.templateLoader},
      dependencies: ${JSON.stringify(elementMetaData.dependencies)},
      imports: ${JSON.stringify(elementMetaData.imports)}
    },\n`;
  }
};

const layoutStack: string[] = [];

const crawlRoutesFolder = (path = routesFolder) => {
  const entries = Array.from(walkSync(path, {
    includeSymlinks: false,
    includeDirs: true,
    includeFiles: true,
    maxDepth: 1,
  }));

  const files = entries.filter((e) => e.isFile);
  const subdirectories = entries.filter((e) =>
    e.isDirectory && e.path !== path
  );

  const layout = files.find((file) => file.name === "_layout.html");
  if (layout) {
    const content = Deno.readTextFileSync(layout.path);

    let fragment;
    try {
      fragment = fragments.parseOrThrow(content);
    } catch (error) {
      console.error(`Something went wrong while parsing ${layout.path}`);
      throw error;
    }

    // Collect dependencies
    const dependencies = new Set<string>();
    for (const element of fragment) {
      walkTree(element, (node) => {
        if (node.kind === Kind.CUSTOM) {
          dependencies.add(node.tagName);
        }
      });
    }

    layoutStack.push(`{
      kind: "layout",
      path: "${layout.path}",
      dependencies: ${JSON.stringify(Array.from(dependencies))},
      templateLoader: memoize(() => {
        return fragments.parseOrThrow(Deno.readTextFileSync("${layout.path}"));
        }),
    }`);
  }

  for (const directory of subdirectories) {
    crawlRoutesFolder(directory.path);
  }

  for (const file of files) {
    switch (extname(file.name)) {
      case ".html":
        if (file.name === "index.html") {
          const content = Deno.readTextFileSync(file.path);

          let fragment;
          try {
            fragment = fragments.parseOrThrow(content);
          } catch (error) {
            console.error(`Something went wrong while parsing ${file.path}`);
            throw error;
          }

          // Collect dependencies
          const dependencySet = new Set<string>();
          for (const element of fragment) {
            walkTree(element, (node) => {
              if (node.kind === Kind.CUSTOM) {
                dependencySet.add(node.tagName);
              }
            });
          }

          routesManifest += `"${path}": {
              kind: 'route',
              path: "${path}",
              files: ["${file.path}"],
              templateLoader: memoize(() => {
                return fragments.parseOrThrow(Deno.readTextFileSync("${file.path}"));
                }),
              dependencies: ${JSON.stringify(Array.from(dependencySet))},
              layouts: [${layoutStack.join()}]
            },\n`;
        }
        break;

      case ".js":
      case ".ts":
        if (file.name.includes("-")) {
          const tagName = file.name.split(".")[0];
          const className = kebabToPascal(tagName);
          const content = Deno.readTextFileSync(file.path);
          const imports = extractImports(content);

          classImports += `import { ${className} } from "${
            join("..", file.path)
          }";\n`;

          elementsManifest += `"${tagName}": {
              tagName: "${tagName}",
              kind: "custom-element",
              class: ${className},
              path: "${path}",
              files: ["${file.path}"],
              dependencies: [],
              imports: ${JSON.stringify(imports)}
             },\n`;
        }
        break;
    }
  }

  if (layout) {
    layoutStack.pop();
  }
};

export const generateManifest = (
  options?: { transform?: (content: string) => string },
): void => {
  console.log("Generating manifest...");

  let manifest = `import { fragments, shadowRoot } from "$core/parser";
import { memoize } from '$core/utils';
import type { Manifest } from "$core";\n\n`;

  crawlElementsFolder();
  crawlRoutesFolder();

  manifest += classImports;
  manifest += `\n
export const manifest = {
  elements: {${elementsManifest}},
  routes: {${routesManifest}},
 } satisfies Manifest;\n`;

  ensureDirSync(generatedFolder);
  Deno.writeTextFileSync(
    join(generatedFolder, "manifest.ts"),
    options?.transform ? options.transform(manifest) : manifest,
  );
};

/**
 * Return the build order of a list of components, taking their relative dependencies into account
 */
export function sortComponents<
  T extends
    | Pick<ElementManifest, "tagName" | "dependencies" | "path">
    | Pick<RouteManifest, "dependencies" | "path">,
>(components: T[]): T[] {
  const ids = new Set<string>();

  let sorted: T[] = [];

  let prevLength = components.length;
  while (components.length > 0) {
    // Find the leaves
    const { leaveNodes, interiorNodes } = Object.groupBy(components, (c) => {
      return c.dependencies.every((d) => ids.has(d))
        ? "leaveNodes"
        : "interiorNodes";
    });

    if (leaveNodes) {
      sorted = sorted.concat(leaveNodes);

      for (const leave of leaveNodes) {
        if ("tagName" in leave) {
          ids.add(leave.tagName);
        }
      }
    }

    if (interiorNodes) {
      // Update remaining components
      components = interiorNodes;
    }

    if (prevLength === components.length) {
      // In case the dependency graph is not a tree (recursive components?)
      break;
    }

    prevLength = components.length;
  }

  return sorted.concat(components);
}
