import { isElementNode } from "@radish/htmlcrunch";
import { assert } from "@std/assert";
import { bindingConfig } from "@radish/runtime/utils";
import { Handler, handlerFor } from "@radish/effect-system";
import { render } from "$effects/render.ts";
import { setAttribute } from "../../common.ts";
import { contextLookup } from "../../state.ts";

export const handleBindDirective = handlerFor(
  render.directive,
  (node, attrKey, attrValue) => {
    if (attrKey.startsWith("bind:")) {
      const property = attrKey.split(":")[1] as keyof typeof bindingConfig;

      assert(
        Object.keys(bindingConfig).includes(property),
        `${property} is not bindable`,
      );

      const identifier = attrValue || property;
      const value = contextLookup(identifier);

      assert(
        bindingConfig[property].type.includes(typeof value),
        `@bind:${property}=${identifier} should reference a value of type ${
          bindingConfig[property].type.join("|")
        } and "${identifier}" has type ${typeof value}`,
      );

      assert(isElementNode(node));
      setAttribute(node.attributes, property, value);
    }

    return Handler.continue(node, attrKey, attrValue);
  },
);
