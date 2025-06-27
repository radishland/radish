import { config } from "$effects/config.ts";
import { manifest } from "$effects/manifest.ts";
import type { Manifest } from "$effects/render.ts";
import { build } from "@radish/core/effects";
import { Handler, handlerFor } from "@radish/effect-system";
import { assertObjectMatch } from "@std/assert/object-match";
import { manifestShape } from "../../../hooks/manifest/mod.ts";
import { getFileKind } from "../../../utils/getFileKind.ts";

/**
 * @performs
 * - `config/read`
 */
export const onBuildTransformInsertSpeculationRules = handlerFor(
  build.transform,
  async (path, content) => {
    const kind = getFileKind(path);
    if (kind !== "route") return Handler.continue(path, content);

    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const route = _manifest.routes[path];

    // Just routes not colocated elements
    if (route) {
      const { speculationRules } = await config.read();

      if (speculationRules) {
        content = content.replace(
          "%radish.head%",
          `%radish.head%\n
    <script type="speculationrules">
      ${JSON.stringify(speculationRules)}
    </script>\n`,
        );
      }
    }

    return Handler.continue(path, content);
  },
);
