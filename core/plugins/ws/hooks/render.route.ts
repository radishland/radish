import { config, io, render } from "$effects/mod.ts";
import { indent } from "$lib/utils/text.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { dirname, join } from "@std/path";

const moduleDir = dirname(import.meta.url);

/**
 * Inserts the WebSocket script in the head when rendering routes in dev mode
 *
 * The script is inserted at build time for prerendered routes and at request time for ssr routes
 *
 * @performs
 * - `config/read`
 * - `io/read` Retrieves the ws script to insert
 */
export const handleInsertWebSocketScript = handlerFor(
  render.route,
  async (route, insertHead, insertBody) => {
    const { args } = await config.read();

    if (args?.dev) {
      // the script can be remote in preview contexts
      const rawScript = await io.read(join(moduleDir, "./script.nofmt.html"));

      insertHead += "\n" + indent(rawScript, 2 * 2);
    }
    return Handler.continue(route, insertHead, insertBody);
  },
);
