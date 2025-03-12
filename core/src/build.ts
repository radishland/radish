import { serializeFragments } from "@radish/htmlcrunch";
import { emptyDirSync, ensureDirSync, existsSync, walkSync } from "@std/fs";
import { dirname, extname, join } from "@std/path";
import {
  buildFolder,
  generatedFolder,
  libFolder,
  routesFolder,
  ts_extension_regex,
} from "./constants.ts";
import type {
  ElementManifest,
  Manifest,
  RouteManifest,
} from "./generate/manifest.ts";
import { manifest, sortComponents } from "./generate/manifest.ts";
import { stripTypes } from "./transforms.ts";
import type { Transform } from "./types.d.ts";
import { applyServerEffects, serializeWebComponent } from "./walk.ts";
import type { SpeculationRules } from "./generate/speculationrules.ts";
import { dev } from "$env";

const cssTransforms: Transform[] = [];
const htmlTransforms: Transform[] = [];
const jsTransforms: Transform[] = [];
const tsTransforms: Transform[] = [stripTypes];

export const buildFile = async (src: string, dest: string): Promise<void> => {
  let content = Deno.readTextFileSync(src);
  let transforms: Transform[] = [];

  switch (extname(src)) {
    case ".css": {
      transforms = cssTransforms;
      break;
    }
    case ".html": {
      transforms = htmlTransforms;
      break;
    }
    case ".js": {
      transforms = jsTransforms;
      break;
    }
    case ".ts": {
      transforms = tsTransforms;
      break;
    }
  }

  for (const transform of transforms) {
    content = await transform({ content, path: src });
  }

  // Transpile .ts files to .js
  if (dest.endsWith(".ts")) {
    dest = dest.replace(ts_extension_regex, ".js");
  }

  Deno.writeTextFileSync(dest, content);
};

const buildDir = async (src: string, dest: string) => {
  if (!existsSync(src)) return;
  ensureDirSync(dest);

  for (const entry of Deno.readDirSync(src)) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isFile) {
      await buildFile(srcPath, destPath);
    }
  }
};

const buildElement = async (element: ElementManifest) => {
  for (
    const entry of walkSync(element.path, {
      includeFiles: true,
      includeDirs: false,
      maxDepth: 1,
    })
  ) {
    const srcFile = entry.path;
    const destFile = join(buildFolder, srcFile);

    ensureDirSync(dirname(destFile));
    if (
      element.kind === "web-component" &&
      extname(srcFile) === ".html" &&
      element.files.includes(srcFile)
    ) {
      const content = serializeWebComponent(element);

      Deno.writeTextFileSync(destFile, content);
    } else {
      await buildFile(srcFile, destFile);
    }
  }
};

const buildRoute = (
  route: RouteManifest,
  options: {
    appContent: string;
    importmapContent: string;
    speculationRules?: SpeculationRules;
  },
) => {
  const srcFile = join(route.path, "index.html");
  const destFile = join(buildFolder, srcFile);
  ensureDirSync(dirname(destFile));

  let pageHeadContent = `
    <script type="importmap">
      ${options.importmapContent}
    </script>`;

  if (options?.speculationRules) {
    pageHeadContent += `
    <script type="speculationrules">
      ${JSON.stringify(options.speculationRules)}
    </script>`;
  }

  // Auto-import custom element modules
  const imports = route.dependencies.toReversed().map((dependency) => {
    const element: ElementManifest | undefined = manifest.elements[dependency];
    if (!element) return undefined;
    return element.kind === "unknown-element" ? undefined : element.files
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

  const pageFragments = route.layouts.map((layout) => layout.templateLoader());
  pageFragments.push(route.templateLoader().map(applyServerEffects));

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

  const pageContent = options.appContent
    .replace("%radish.head%", pageHeadContent)
    .replace("%radish.body%", pageBodyContent);

  Deno.writeTextFileSync(destFile, pageContent);
};

export const mockGlobals = (): void => {
  // @ts-ignore mock HTMLElement methods on the server to be noop
  globalThis.HTMLElement = class HTMLElement {
    // Event Target
    addEventListener() {}
    dispatchEvent() {}
    removeEventListener() {}
    // Node
    appendChild() {}
    cloneNode() {}
    compareDocumentPosition() {}
    contains() {}
    getRootNode() {}
    hasChildNodes() {}
    insertBefore() {}
    isDefaultNamespace() {}
    isEqualNode() {}
    isSameNode() {}
    lookupNamespaceURI() {}
    lookupPrefix() {}
    normalize() {}
    removeChild() {}
    replaceChild() {}
    // Element
    after() {}
    animate() {}
    append() {}
    attachShadow() {}
    before() {}
    checkVisibility() {}
    closest() {}
    computedStyleMap() {}
    getAnimations() {}
    getAttribute() {}
    getAttributeNames() {}
    getAttributeNode() {}
    getAttributeNodeNS() {}
    getAttributeNS() {}
    getBoundingClientRect() {}
    getClientRects() {}
    getElementsByClassName() {}
    getElementsByTagName() {}
    getElementsByTagNameNS() {}
    getHTML() {}
    hasAttribute() {}
    hasAttributeNS() {}
    hasAttributes() {}
    hasPointerCapture() {}
    insertAdjacentElement() {}
    insertAdjacentHTML() {}
    insertAdjacentText() {}
    matches() {}
    prepend() {}
    querySelector() {}
    querySelectorAll() {}
    releasePointerCapture() {}
    remove() {}
    removeAttribute() {}
    removeAttributeNode() {}
    removeAttributeNS() {}
    replaceChildren() {}
    replaceWith() {}
    requestFullscreen() {}
    requestPointerLock() {}
    scroll() {}
    scrollBy() {}
    scrollIntoView() {}
    scrollTo() {}
    setAttribute() {}
    setAttributeNode() {}
    setAttributeNodeNS() {}
    setAttributeNS() {}
    setHTMLUnsafe() {}
    setPointerCapture() {}
    toggleAttribute() {}
    // HTML Element
    attachInternals() {}
    blur() {}
    click() {}
    focus() {}
    hidePopover() {}
    showPopover() {}
    togglePopover() {}
  };
  // @ts-ignore no op document methods on the server
  globalThis.document = {
    querySelector() {},
  };
  // @ts-ignore no window on the server
  globalThis.window = undefined;
  // @ts-ignore no customElements on the server
  globalThis.customElements = undefined;
};

type BuildOptions = {
  /**
   * The speculation rules of the whole site
   *
   * https://github.com/WICG/nav-speculation/blob/main/triggers.md
   *
   * Spec: https://wicg.github.io/nav-speculation/speculation-rules.html
   */
  speculationRules?: SpeculationRules;
};

/**
 * Runs the build process
 */
export const build = async (
  manifestObject: Manifest,
  options?: BuildOptions,
): Promise<void> => {
  console.log("Building...");

  manifest.elements = manifestObject.elements;
  manifest.routes = manifestObject.routes;

  emptyDirSync(buildFolder);

  const sorted = sortComponents([
    ...Object.values(manifest.elements),
    ...Object.values(manifest.routes),
  ]);

  const appContent = Deno.readTextFileSync(
    join(routesFolder, "_app.html"),
  );
  const importmapContent = Deno.readTextFileSync(
    join(generatedFolder, "importmap.json"),
  );

  for (const component of sorted) {
    if (component.kind !== "route") {
      await buildElement(component);
    } else {
      buildRoute(component, {
        appContent,
        importmapContent,
        speculationRules: options?.speculationRules,
      });
    }
  }

  const libDest = join(buildFolder, libFolder);
  await buildDir(libFolder, libDest);
};
