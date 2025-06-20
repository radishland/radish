import { manifest } from "$effects/manifest.ts";
import { build } from "$effects/mod.ts";
import {
  type ElementManifest,
  type Manifest,
  render,
} from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { assertObjectMatch } from "@std/assert";
import { manifestShape } from "../hooks/manifest/mod.ts";

/**
 * @performs
 * - `manifest/get`
 */
export const handleAutoImport = handlerFor(
  render.route,
  async (route, insertHead, insertBody) => {
    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const imports: string[] = [];

    for (const dependency of route.dependencies.toReversed()) {
      const element: ElementManifest | undefined =
        _manifest.elements[dependency];

      const source = element?.files
        .find((p) => p.endsWith(".ts") || p.endsWith(".js"));
      if (!source) continue;

      imports.push(await build.dest(source));
    }

    if (imports.length > 0) {
      insertHead += `\n
      <script type="module">
        ${imports.map((i) => `import "/${i}";`).join("\n\t")}
      </script>\n`;
    }
    return Handler.continue(route, insertHead, insertBody);
  },
);
