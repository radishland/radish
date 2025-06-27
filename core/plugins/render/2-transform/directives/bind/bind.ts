import { isElementNode } from "@radish/htmlcrunch";
import { assert } from "@std/assert";
import { bindingConfig } from "@radish/runtime/utils";
import { Handler, handlerFor } from "@radish/effect-system";
import { render } from "$effects/render.ts";
import { setAttribute } from "../../../utils/setAttribute.ts";
import { contextLookup } from "../../../utils/contextLookup.ts";

export const onRenderTransformBindDirective = handlerFor(
  render.transformNode,
  (path, node) => {
    if (!isElementNode(node)) return Handler.continue(path, node);

    const bindDirectives = node.attributes.filter(([key, _value]) =>
      key.startsWith("bind:")
    );

    for (const [attrKey, attrValue] of bindDirectives) {
      const property = attrKey.split("bind:")[1] as keyof typeof bindingConfig;

      assert(
        Object.keys(bindingConfig).includes(property),
        `${property} is not bindable`,
      );

      const identifier = attrValue || property;
      const value = contextLookup(node, identifier);

      assert(
        bindingConfig[property].type.includes(typeof value),
        `@bind:${property}=${identifier} should reference a value of type ${
          bindingConfig[property].type.join("|")
        } and "${identifier}" has type ${typeof value}`,
      );

      assert(isElementNode(node));
      setAttribute(node.attributes, property, value);
    }

    return Handler.continue(path, node);
  },
);
