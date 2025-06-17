import { build, io, type Manifest, manifest } from "$effects/mod.ts";
import { render } from "$effects/render.ts";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { serializeFragments, shadowRoot } from "@radish/htmlcrunch";
import { assertExists, assertObjectMatch } from "@std/assert";
import { transformNode } from "../transforms/transform-node.ts";
import { manifestShape } from "../hooks/manifest/mod.ts";

/**
 * Renders a component
 *
 * @performs
 * - `manifest/get`
 * - `render/transformNode`
 */
export const handleRenderComponents = handlerFor(
  render.component,
  async (element) => {
    assertExists(element.templatePath);
    const template = await io.read(element.templatePath);
    const fragments = shadowRoot.parseOrThrow(template);

    using scope = new HandlerScope();

    // Perf: locally override io/read to return built templates for depended-upon elements
    // This is sound since building is ordered
    // But only makes sense for pre-rendered elements
    if (element?.dependencies?.length) {
      const dependenciesPaths: string[] = [];
      const _manifest = await manifest.get() as Manifest;
      assertObjectMatch(_manifest, manifestShape);

      for (const dependency of element.dependencies) {
        const element = _manifest.elements[dependency];
        assertExists(element?.templatePath);
        dependenciesPaths.push(element.templatePath);
      }

      scope.addHandler(handlerFor(io.read, async (path) => {
        if (dependenciesPaths.includes(path)) {
          const builtTemplate = await build.dest(path);
          return await io.read(builtTemplate);
        }

        return Handler.continue(path);
      }, { reentrant: false }));
    }

    const nodes = await Promise.all(fragments.map(transformNode));
    return serializeFragments(nodes);
  },
);
