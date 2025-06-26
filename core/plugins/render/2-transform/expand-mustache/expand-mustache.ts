import { manifest } from "$effects/manifest.ts";
import type { Manifest } from "$effects/mod.ts";
import { render } from "$effects/render.ts";
import { fragments, rawTextAndInterpolatedIdentifiers } from "$lib/parser.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import {
  isElementNode,
  isMNode,
  isTextNode,
  type MElement,
} from "@radish/htmlcrunch";
import { assert, assertExists } from "@std/assert";
import { contextLookup } from "../../utils/contextLookup.ts";

/**
 * Expands the mustache syntax inside text nodes
 *
 * @example
 * ```html
 * <h1>{content}</h1>
 *
 * <!-- Expands into -->
 * <h1><r-out textContent="content"></r-out></h1>
 * ```
 *
 * @hooks `render/transformSingle`
 * @performs `manifest/get`
 * @performs `manifest/set`
 */
export const handleMustache = handlerFor(
  render.transformNode,
  async (node) => {
    if (!isMNode(node)) return Handler.continue(node);
    if (!isTextNode(node)) return Handler.continue(node);

    const parse = rawTextAndInterpolatedIdentifiers.parse(node.text);

    if (parse.success) {
      assert(parse.results.length === 1 && parse.results[0]);
      const tokens = parse.results[0].value;
      const parent = node.parent;

      if (!parent) {
        const identifiers = tokens
          .filter((token) => token.type === "identifier")
          .map((i) => i.value);

        throw new Error(`Unhandled identifiers: ${identifiers.join(", ")}.`);
      }

      const expanded = tokens.map((token) => {
        if (token.type === "text") return token.value;

        const identifier = token.value;
        const value = contextLookup(parent, identifier);

        return `<r-out textContent="${identifier}">${value}</r-out>`;
      });

      const nodes = fragments.parseOrThrow(expanded.join(""));

      for (const _node of nodes) {
        if (isElementNode(_node)) {
          _node.parent = node.parent;
        }
      }

      // Update the manifest
      const _manifest = await manifest.get() as Manifest;

      let parentRegistry: MElement | undefined = parent;
      while (!parentRegistry?.tagName.includes("-")) {
        parentRegistry = parentRegistry?.parent;
      }
      assertExists(parentRegistry);

      const parentElement = _manifest.elements[parentRegistry.tagName];
      assertExists(parentElement);

      const parentDependencies = parentElement.dependencies ?? [];

      if (!parentDependencies.includes("r-out")) {
        parentElement.dependencies = [...parentDependencies, "r-out"];
        await manifest.set(_manifest);
      }

      return nodes;
    }

    return Handler.continue(node);
  },
);
