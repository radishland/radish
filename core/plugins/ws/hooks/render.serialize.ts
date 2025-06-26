import { config, fs, type Manifest, manifest, render } from "$effects/mod.ts";
import { manifestShape } from "$lib/plugins/render/hooks/manifest/mod.ts";
import { getFileKind } from "$lib/plugins/render/utils/getFileKind.ts";
import { indent } from "$lib/utils/text.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { assertExists } from "@std/assert/exists";
import { assertObjectMatch } from "@std/assert/object-match";
import { dirname, join } from "@std/path";

const moduleDir = dirname(import.meta.url);

/**
 * Inserts the WebSocket script in the head when rendering routes in dev mode
 *
 * The script is inserted at build time for prerendered routes and at request time for ssr routes
 *
 * @performs
 * - `config/read`
 * - `fs/read` Retrieves the ws script to insert
 */
export const handleInsertWebSocketScript = handlerFor(
  render.serialize,
  async (path, nodes) => {
    const kind = getFileKind(path);
    if (kind !== "route") return Handler.continue(path, nodes);

    let serialized = await render.serialize(path, nodes);

    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const route = _manifest.routes[path];
    assertExists(route);

    const { args } = await config.read();

    if (args?.dev) {
      // the script can be remote in preview contexts
      const rawScript = await fs.read(join(moduleDir, "./script.nofmt.html"));

      serialized = serialized.replace(
        "%radish.head%",
        "%radish.head%\n" + indent(rawScript, 2 * 2),
      );
    }
    return serialized;
  },
  { reentrant: false },
);
