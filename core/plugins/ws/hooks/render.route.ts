import { config, io, render } from "$effects/mod.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { dirname, join } from "@std/path";

const moduleDir = dirname(import.meta.url);

/**
 * Inserts WebSocket script in the head of routes to initiate a WebSocket connection to enable HMR
 *
 * @performs
 * - `config/read`
 * - `io/read` Retrieve the ws script to insert
 */
export const handleInsertWebSocketScript = handlerFor(
  render.route,
  async (route, insertHead, insertBody) => {
    const { args } = await config.read();
    // the script can be remote in preview contexts
    const rawScript = await io.read(join(moduleDir, "./script.nofmt.ts"));

    if (args?.dev) {
      insertHead += `<script>\n${
        rawScript.split("\n")
          .map((l) => `      ${l}`).join("\n")
      }\n    </script>`;
    }
    return Handler.continue(route, insertHead, insertBody);
  },
);
