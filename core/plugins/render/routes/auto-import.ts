import { assertObjectMatch } from "@std/assert";
import { Handler, handlerFor } from "@radish/effect-system";
import { manifest } from "$effects/manifest.ts";
import {
  type ElementManifest,
  type Manifest,
  render,
} from "$effects/render.ts";
import { manifestShape } from "../hooks/manifest/mod.ts";
import { ts_extension_regex } from "../../../constants.ts";

/**
 * @performs
 * - `manifest/get`
 */
export const handleAutoImport = handlerFor(
  render.route,
  async (route, insertHead, insertBody) => {
    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const imports = route.dependencies
      .toReversed()
      .map((dependency) => {
        const element: ElementManifest | undefined =
          _manifest.elements[dependency];

        if (!element) return undefined;

        return element.files
          .find((p) => p.endsWith(".ts") || p.endsWith(".js"))
          ?.replace(ts_extension_regex, ".js");
      }).filter((i) => i !== undefined);

    if (imports.length > 0) {
      insertHead += `\n
      <script type="module">
        ${imports.map((i) => `import "/${i}";`).join("\n\t")}
      </script>\n`;
    }
    return Handler.continue(route, insertHead, insertBody);
  },
);
