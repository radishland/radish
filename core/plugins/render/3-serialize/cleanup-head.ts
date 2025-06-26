import { render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { getFileKind } from "../utils/getFileKind.ts";

export const onRenderSerializeCleanupHead = handlerFor(
  render.serialize,
  async (path, nodes) => {
    const kind = getFileKind(path);
    if (kind !== "route") return Handler.continue(path, nodes);

    const serialized = await render.serialize(path, nodes);

    return serialized.replace(/^\s*%radish.head%\n?/m, "");
  },
  { reentrant: false },
);
