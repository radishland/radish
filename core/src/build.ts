import type { Transform } from "./types.d.ts";
import { serializeFragments } from "@fcrozatier/monarch/html";
import { emptyDirSync, ensureDirSync, existsSync, walkSync } from "@std/fs";
import { dirname, extname, join } from "@std/path";
import {
  buildFolder,
  generatedFolder,
  libFolder,
  routesFolder,
} from "./conventions.ts";
import type {
  ElementManifest,
  Manifest,
  RouteManifest,
} from "./generate/manifest.ts";
import { manifest, sortComponents } from "./generate/manifest.ts";
import { dev } from "./start.ts";
import { stripTypes } from "./transforms.ts";
import { applyServerEffects, serializeWebComponent } from "./walk.ts";

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
    dest = dest.replace(/\.ts$/, ".js");
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

const buildElement = async (
  element: ElementManifest,
) => {
  const parents = new Set(element.path.map(dirname));

  if (parents.size > 1) {
    throw new Error("Multiple parent folders found");
  }

  const parentFolder = [...parents][0];

  for (const path of element.path) {
    const srcFile = path;
    const destFile = join(buildFolder, srcFile);

    ensureDirSync(dirname(destFile));

    if (extname(srcFile) === ".html") {
      const content = serializeWebComponent(element);

      Deno.writeTextFileSync(destFile, content);
    } else {
      await buildFile(srcFile, destFile);
    }
  }

  for (
    const entry of walkSync(parentFolder, {
      includeFiles: true,
      includeDirs: false,
      maxDepth: 1,
      exts: [".css"],
    })
  ) {
    const srcFile = entry.path;
    const destFile = join(buildFolder, srcFile);

    ensureDirSync(dirname(destFile));
    await buildFile(srcFile, destFile);
  }
};

const buildRoute = (
  route: RouteManifest,
  options: { appContent: string; importmapContent: string; dev: boolean },
) => {
  const srcFile = join(route.path, "index.html");
  const destFile = join(buildFolder, srcFile);
  ensureDirSync(dirname(destFile));

  let pageHeadContent = `<script type="importmap">
      ${options.importmapContent}
    </script>`;

  // Insert WebSocket script
  if (options.dev) {
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

  const pageBodyContent = serializeFragments(pageFragments.flat(), {
    removeComments: !dev,
  });

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

/**
 * Runs the build process
 */
export const build = async (
  manifestObject: Manifest,
  options: { dev: boolean },
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
      buildRoute(component, { appContent, importmapContent, dev: options.dev });
    }
  }

  const libDest = join(buildFolder, libFolder);
  await buildDir(libFolder, libDest);
};
