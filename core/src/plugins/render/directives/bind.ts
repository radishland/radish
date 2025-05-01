import { assert } from "@std/assert";
import { bindingConfig } from "../../../../../runtime/src/utils.ts";
import { Handler } from "../../../../exports/effects.ts";
import { handlerFor } from "../../../effects/effects.ts";
import { render } from "../../../effects/render.ts";
import { contextLookup } from "../render.ts";
import { isElementNode } from "@radish/htmlcrunch";
import { setAttribute } from "../common.ts";

export const handleBindDirective = handlerFor(
  render.directive,
  async (attrKey: string, attrValue: string) => {
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

      const node = await render.getCurrentNode();
      assert(isElementNode(node));

      setAttribute(node.attributes, property, value);
    }

    return Handler.continue(attrKey, attrValue);
  },
);
