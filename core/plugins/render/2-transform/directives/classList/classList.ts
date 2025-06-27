import { render } from "$effects/render.ts";
import { Handler, handlerFor } from "@radish/effect-system";
import { isElementNode } from "@radish/htmlcrunch";
import { assert } from "@std/assert";
import { contextLookup } from "../../../utils/contextLookup.ts";

export const onRenderTransformClassListDirective = handlerFor(
  render.transformNode,
  (path, node) => {
    if (!isElementNode(node)) return Handler.continue(path, node);

    const [classListDirective] = node.attributes.filter(([key, _value]) =>
      key === ("classList")
    );

    if (classListDirective) {
      const identifier = classListDirective[1];
      const value = contextLookup(node, identifier);

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

    return Handler.continue(path, node);
  },
);
