import { assert } from "@std/assert";
import { handlerFor } from "../../../../exports/effects.ts";
import { render } from "../../../effects/render.ts";
import { handleAttrDirective } from "./attr.ts";
import { handleBindDirective } from "./bind.ts";
import { handleBoolDirective } from "./bool.ts";
import { handleClassListDirective } from "./classList.ts";
import { handleHtmlDirective } from "./html.ts";
import { handleTextDirective } from "./text.ts";
import { isElementNode } from "../../../../../htmlcrunch/mod.ts";
import { setAttribute } from "../common.ts";

const baseHandler = handlerFor(
  render.directive,
  async (attrKey, attrValue) => {
    const node = await render.getCurrentNode();
    assert(isElementNode(node));
    setAttribute(node.attributes, attrKey, attrValue);
    return;
  },
);

export const handleDirectives = [
  handleAttrDirective,
  handleBindDirective,
  handleBoolDirective,
  handleClassListDirective,
  handleHtmlDirective,
  handleTextDirective,
  baseHandler,
];
