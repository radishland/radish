import { fs, type Manifest, manifest, render } from "$effects/mod.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { fragments, shadowRoot } from "@radish/htmlcrunch";
import { assertExists } from "@std/assert";
import { filename } from "../../../utils/path.ts";
import { getFileKind } from "../utils/getFileKind.ts";

export const onRenderParse = handlerFor(render.parse, async (path, content) => {
  const manifestObject = await manifest.get() as Manifest;
  const fileKind = getFileKind(path);

  if (fileKind === "element") {
    const tagName = filename(path);
    const element = manifestObject.elements[tagName];
    assertExists(element?.templatePath);

    const template = await fs.read(element.templatePath);
    const nodes = shadowRoot.parseOrThrow(template);

    return nodes;
  }

  if (fileKind === "route") {
    const route = manifestObject.routes[path];
    assertExists(route?.templatePath);

    const template = await fs.read(route.templatePath);
    const nodes = fragments.parseOrThrow(template);

    return nodes;
  }

  if (fileKind === "layout") {
    const layout = manifestObject.layouts[path];
    assertExists(layout?.templatePath);

    const template = await fs.read(layout.templatePath);
    const nodes = fragments.parseOrThrow(template);

    return nodes;
  }

  return Handler.continue(path, content);
});
