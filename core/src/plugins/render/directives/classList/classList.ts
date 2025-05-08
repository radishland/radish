import { isElementNode } from "@radish/htmlcrunch";
import { assert } from "@std/assert";

import { Handler, handlerFor } from "@radish/effect-system";
import { render } from "../../../../effects/render.ts";
import { contextLookup } from "../../state.ts";

export const handleClassListDirective = handlerFor(
  render.directive,
  (node, attrKey, attrValue) => {
    if (attrKey === "classlist") {
      const identifier = attrValue || attrKey;
      const value = contextLookup(identifier);

      assert(typeof value === "object", "classList should reference an object");
      assert(isElementNode(node));

      const classAttr = node.attributes.find(([k, _]) => k === "class");
      let classes = classAttr?.[1] ?? "";

      for (const [k, v] of Object.entries(value)) {
        if (v?.valueOf()) {
          classes += ` ${k} `;
        } else {
          for (const className of k.split(" ")) {
            classes.replace(className, "");
          }
        }
      }
      classes = classes.trim();

      if (classAttr) {
        classAttr[1] = classes;
      } else {
        node.attributes.push(["class", classes]);
      }
    }

    return Handler.continue(node, attrKey, attrValue);
  },
);
