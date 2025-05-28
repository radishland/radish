import { importmap } from "$effects/importmap.ts";
import { build } from "$effects/mod.ts";
import { target_head } from "$lib/constants.ts";
import { Handler, handlerFor } from "$lib/effect-system.ts";
import { indent } from "$lib/utils/text.ts";
import { assertMatch } from "@std/assert/match";
import { basename } from "@std/path/basename";

export const handleImportmapBuildTransform = handlerFor(
  build.transform,
  async (path: string, content: string) => {
    if (basename(path) === "_app.html") {
      const head = String.raw(
        {
          raw: [
            '\n<script type="importmap">\n',
            "\n",
            "</script>\n",
            "\n",
            "%radish.head%",
          ],
        },
        indent(JSON.stringify(await importmap.get()), 2),
      );

      assertMatch(
        content,
        target_head,
        `%radish.head% target not found in file "${path}". Try moving the importmap plugin down the list.`,
      );
      content = content.replace(target_head, indent(head, 4));
    }

    return Handler.continue(path, content);
  },
);
