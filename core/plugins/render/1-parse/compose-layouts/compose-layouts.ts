import { manifest } from "$effects/manifest.ts";
import { fs } from "$effects/mod.ts";
import { type LayoutManifest, type Manifest, render } from "$effects/render.ts";
import { isParent } from "$lib/utils/path.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { fragments } from "@radish/htmlcrunch";
import { assertObjectMatch } from "@std/assert";
import { dirname } from "@std/path";
import { manifestShape } from "../../hooks/manifest/mod.ts";
import { getFileKind } from "../../utils/getFileKind.ts";

/**
 * @hooks `render/parse`
 *
 * @performs `render/parse`
 * @performs `fs/read`
 * @performs `manifest/get`
 */
export const onRenderParseComposeLayouts = handlerFor(
  render.parse,
  async (path, content) => {
    const kind = getFileKind(path);
    if (kind !== "route") return Handler.continue(path, content);

    const nodes = await render.parse(path, content);

    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const layouts: LayoutManifest[] = Object.values(_manifest.layouts)
      .filter((layout) => isParent(dirname(layout.path), path));

    const layoutFragments = await Promise.all(
      layouts.map(async (layout) => {
        const template = await fs.read(layout.templatePath);
        return fragments.parseOrThrow(template);
      }),
    );

    const layoutsFragmentsFlat = layoutFragments.flat();

    return [...layoutsFragmentsFlat, ...nodes];
  },
  { reentrant: false },
);
