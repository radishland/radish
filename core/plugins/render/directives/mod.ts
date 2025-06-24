import { isElementNode } from "@radish/htmlcrunch";
import { handlerFor } from "@radish/effect-system";
import { render } from "$effects/render.ts";
import { setAttribute } from "../utils/setAttribute.ts";
import { handleAttrDirective } from "./attr/attr.ts";
import { handleBindDirective } from "./bind/bind.ts";
import { handleBoolDirective } from "./bool/bool.ts";
import { handleClassListDirective } from "./classList/classList.ts";
import { handleHtmlDirective } from "./html/html.ts";
import { handleTextDirective } from "./textContent/text.ts";

export const handleDirectiveBase = handlerFor(
  render.directive,
  (node, attrKey, attrValue) => {
    if (
      isElementNode(node) &&
      node.attributes.filter(([k, v]) => k === attrKey && v === attrValue)
          .length === 0
    ) {
      setAttribute(node.attributes, attrKey, attrValue);
    }

    return;
  },
);

/**
 * @hooks
 * - `render/directive`
 */
export const handleDirectives = [
  handleAttrDirective,
  handleBindDirective,
  handleBoolDirective,
  handleClassListDirective,
  handleHtmlDirective,
  handleTextDirective,
  handleDirectiveBase,
];
