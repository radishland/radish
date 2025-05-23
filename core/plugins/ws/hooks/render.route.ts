import { config, render } from "$effects/mod.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { dirname, fromFileUrl, join } from "@std/path";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const rawScript = Deno.readTextFileSync(join(moduleDir, "./script.nofmt.ts"));

/**
 * Inserts WebSocket script in the head of routes to initiate a WebSocket connection to enable HMR
 *
 * @performs
 * - `config/read`
 */
export const handleInsertWebSocketScript = handlerFor(
  render.route,
  async (route, insertHead, insertBody) => {
    const { args } = await config.read();

    if (args?.dev) {
      insertHead += `<script>\n${
        rawScript.split("\n")
          .map((l) => `      ${l}`).join("\n")
      }\n    </script>`;
    }
    return Handler.continue(route, insertHead, insertBody);
  },
);
