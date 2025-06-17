import { manifest } from "$effects/manifest.ts";
import { io } from "$effects/mod.ts";
import { type LayoutManifest, type Manifest, render } from "$effects/render.ts";
import { dev } from "$lib/environment.ts";
import { isParent } from "$lib/utils/path.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { fragments, serializeFragments } from "@radish/htmlcrunch";
import { assertObjectMatch } from "@std/assert";
import { dirname } from "@std/path";
import { manifestShape } from "../hooks/manifest/mod.ts";
import { transformNode } from "../transforms/transform-node.ts";

/**
 * @performs
 * - `manifest/get`
 */
export const handleRouteLayoutsAndHeadElements = handlerFor(
  render.route,
  async (route, insertHead, insertBody) => {
    const _manifest = await manifest.get() as Manifest;
    assertObjectMatch(_manifest, manifestShape);

    const layouts: LayoutManifest[] = Object.values(_manifest.layouts)
      .filter((layout) => isParent(dirname(layout.path), route.path));

    const pageFragments = await Promise.all(
      layouts.map(async (layout) => {
        const template = await io.read(layout.templatePath);
        return fragments.parseOrThrow(template);
      }),
    );

    const routeTemplate = await io.read(route.templatePath);
    const routeFragmentsTransformed = await Promise.all(
      fragments.parseOrThrow(routeTemplate).map(transformNode),
    );
    pageFragments.push(routeFragmentsTransformed);

    const pageGroups = Object.groupBy(
      pageFragments.flat(),
      (node) => {
        if (node.kind === "NORMAL" && node.tagName === "head") {
          return "head";
        }
        return "body";
      },
    );

    if (pageGroups.head) {
      const head = pageGroups.head
        .map((node) => node.kind === "NORMAL" && node.children)
        .filter((node) => !!node).flat();

      insertHead += serializeFragments(head, { removeComments: !dev });
    }

    if (pageGroups.body) {
      insertBody += serializeFragments(pageGroups.body, {
        removeComments: !dev,
      });
    }

    return Handler.continue(route, insertHead, insertBody);
  },
);
