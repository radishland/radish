import strip from "@fcrozatier/type-strip";
import { basename, dirname, extname, join } from "@std/path";
import {
  buildFolder,
  generatedFolder,
  routesFolder,
  ts_extension_regex,
} from "./constants.ts";
import type { RadishPlugin } from "./types.d.ts";
import { applyServerEffects, serializeWebComponent } from "./walk.ts";
import type { ElementManifest } from "./generate/manifest.ts";
import { dev } from "$env";
import { serializeFragments } from "../../htmlcrunch/mod.ts";
import type { SpeculationRules } from "./generate/speculationrules.ts";

export const pluginDefaultEmit: RadishPlugin = {
  name: "radish-plugin-default-emit",
  emit: (path) => join(buildFolder, path),
};

/**
 * Strip Types
 *
 * Removes type annotations and comments
 */
export const pluginStripTypes: RadishPlugin = {
  name: "radish-plugin-strip-types",
  transform: (code, path, context) => {
    if (context.format !== ".ts" || path.endsWith(".d.ts")) return null;

    return strip(code, {
      removeComments: true,
      tsToJsModuleSpecifiers: true,
    });
  },
  emit: (path) => {
    if (extname(path) !== ".ts" || path.endsWith(".d.ts")) return null;
    return join(buildFolder, path).replace(ts_extension_regex, ".js");
  },
};

export const pluginTransformElements: RadishPlugin = {
  name: "radish-plugin-transform-elements",
  transform: (_code, path, context) => {
    if (context.format !== ".html") return null;

    const filename = basename(path).split(".")[0];
    const element = context.manifest.elements[filename];

    if (!element) return null;

    return serializeWebComponent(element);
  },
};

export const pluginTransformRoutes: () => RadishPlugin = () => {
  const appContent = Deno.readTextFileSync(
    join(routesFolder, "_app.html"),
  );

  const importmapContent = Deno.readTextFileSync(
    join(generatedFolder, "importmap.json"),
  );

  let speculationRules: SpeculationRules | undefined;

  return {
    name: "radish-plugin-transform-routes",
    configResolved: (options) => {
      speculationRules = options?.speculationRules;
    },
    transform: (_code, path, context) => {
      if (context.format !== ".html") return null;

      const route = context.manifest.routes[dirname(path)];

      if (!route) return null;

      let pageHeadContent = `
    <script type="importmap">
      ${importmapContent}
    </script>`;

      if (speculationRules) {
        pageHeadContent += `
    <script type="speculationrules">
      ${JSON.stringify(speculationRules)}
    </script>`;
      }

      // Auto-import custom element modules
      const imports = route.dependencies.toReversed().map((dependency) => {
        const element: ElementManifest | undefined =
          context.manifest.elements[dependency];

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

      const pageFragments = route.layouts.map((layout) =>
        layout.templateLoader()
      );
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

      const pageContent = appContent
        .replace("%radish.head%", pageHeadContent)
        .replace("%radish.body%", pageBodyContent);

      return pageContent;
    },
  };
};
