import { render } from "$effects/render.ts";
import { identifierInsideMustaches } from "$lib/parser.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { element, isTextNode } from "@radish/htmlcrunch";
import { assert } from "@std/assert/assert";

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
 * @hooks
 * - `render/transformNode`
 */
export const handleMustache = handlerFor(
  render.transformNode,
  (node) => {
    if (!isTextNode(node)) return Handler.continue(node);

    const parse = identifierInsideMustaches.parse(node.text);

    if (parse.success) {
      const value = parse.results[0]?.value;
      assert(value);

      // TODO: ideally we would restore the spacing around the node
      const [_leadingSpaces, identifier, _trailingSpaces] = value;

      const expand = `<r-out textContent="${identifier}"></r-out>`;
      const out = element.parseOrThrow(expand);
      return Handler.continue(out);
    }
    return Handler.continue(node);
  },
);
