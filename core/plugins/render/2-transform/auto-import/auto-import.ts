import { manifest } from "$effects/manifest.ts";
import { build } from "$effects/mod.ts";
import {
  type ElementManifest,
  type Manifest,
  render,
} from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { assertExists, assertObjectMatch } from "@std/assert";
import { manifestShape } from "../../hooks/manifest/mod.ts";
import { getFileKind } from "../../utils/getFileKind.ts";

/**
 * @performs
 * - `manifest/get`
 */
export const onRenderSerializeAutoImport = handlerFor(
  render.serialize,
  async (path, nodes) => {
    const kind = getFileKind(path);
    if (kind !== "route") return Handler.continue(path, nodes);

    let serialized = await render.serialize(path, nodes);

    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const route = _manifest.routes[path];
    assertExists(route);

    const imports: string[] = [];

    for (const dependency of route.dependencies.toReversed()) {
      const element: ElementManifest | undefined =
        _manifest.elements[dependency];

      const source = element?.files
        .find((p) => p.endsWith(".ts") || p.endsWith(".js"));
      if (!source) continue;

      const dest = await build.dest(source);
      imports.push(dest);
    }

    if (imports.length > 0) {
      serialized = serialized.replace(
        "%radish.head%",
        `%radish.head%\n
    <script type="module">
      ${imports.map((i) => `import "/${i}";`).join("\n\t")}
    </script>\n`,
      );
    }
    return serialized;
  },
  { reentrant: false },
);
