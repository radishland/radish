import { config } from "$effects/config.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { type Manifest, render } from "$effects/render.ts";
import { assertExists } from "@std/assert/exists";
import { assertObjectMatch } from "@std/assert/object-match";
import { manifest } from "$effects/manifest.ts";
import { manifestShape } from "../../hooks/manifest/mod.ts";
import { getFileKind } from "../../utils/getFileKind.ts";

/**
 * @performs
 * - `config/read`
 */
export const onRenderSerializeSpeculationRules = handlerFor(
  render.serialize,
  async (path, nodes) => {
    const kind = getFileKind(path);
    if (kind !== "route") return Handler.continue(path, nodes);

    let serialized = await render.serialize(path, nodes);

    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const route = _manifest.routes[path];
    assertExists(route);

    const { speculationRules } = await config.read();

    if (speculationRules) {
      serialized = serialized.replace(
        "%radish.head%",
        `%radish.head%\n
    <script type="speculationrules">
      ${JSON.stringify(speculationRules)}
    </script>\n`,
      );
    }

    return serialized;
  },
  { reentrant: false },
);
