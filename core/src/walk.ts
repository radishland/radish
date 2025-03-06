import {
  booleanAttributes,
  Kind,
  type MFragment,
  type MNode,
  serializeFragments,
  textNode,
} from "@radish/htmlcrunch";
import type { HandlerRegistry } from "@radish/runtime";
import { bindingConfig, spaces_sep_by_comma } from "@radish/runtime/utils";
import {
  type ElementManifest,
  manifest,
  type RouteManifest,
} from "./generate/manifest.ts";

let context: { tagName: string; instance: HandlerRegistry }[] = [];

const contextLookup = (identifier: string) => {
  for (let i = context.length - 1; i >= 0; i--) {
    const { instance } = context[i];
    if (identifier in instance) {
      // @ts-ignore identifier is in registry
      return instance.lookup(identifier)?.valueOf(); // runs the getter and returns the property or method value
    }
  }
};

/**
 * Recursively applies an effect function to all nodes of a component tree
 */
export const walkTree = (
  tree: MNode,
  fn: (value: MNode) => void,
) => {
  fn(tree);

  if ("children" in tree && tree.children?.length) {
    for (const child of tree.children) {
      walkTree(child, fn);
    }
  }
};

const setAttribute = (
  attributes: [string, string][],
  attribute: string,
  value: unknown,
) => {
  if (!["string", "number", "boolean"].includes(typeof value)) {
    throw new Error(
      "Can only set primitive values as attributes",
    );
  }

  if (booleanAttributes.includes(attribute)) {
    value && attributes.push([attribute, ""]);
  } else {
    attributes.push([attribute, `${value}`]);
  }
};

const server_attr_directive = /@attr(\|server)?/;

/**
 * Transforms a component tree by applying server-side effects: [[bind]], [[template inclusion]] etc
 */
export function applyServerEffects(
  element: MNode,
): MNode {
  if (element.kind === "COMMENT" || element.kind === "TEXT") return element;

  const { tagName, attributes, children, kind } = element;

  let template: MNode[] = [];

  if (kind === Kind.CUSTOM) {
    const element: ElementManifest | undefined = manifest.elements[tagName];
    if (element) {
      // component is a custom element
      if (element.kind !== "unknown-element") {
        context.push({ tagName, instance: new element.class() });
      }
      // component has a shadow root
      if (element.kind !== "custom-element") {
        template = element.templateLoader().map(applyServerEffects);
      }
    }
  }

  let innerHTML: MFragment = [];
  const textContent = textNode("");

  for (const attribute of attributes) {
    // @attr attribute
    if (server_attr_directive.test(attribute[0])) {
      const assignments = attribute[1].trim().split(
        spaces_sep_by_comma,
      );

      for (const assignment of assignments) {
        const [attribute, maybeIdentifier] = assignment.split(":");
        const identifier = maybeIdentifier || attribute;

        const value = contextLookup(identifier);
        if (value !== null && value !== undefined) {
          setAttribute(attributes, attribute, value);
        }
      }
    } else if (attribute[0] === "@class") {
      // @class attribute
      const identifier = attribute[1] || "class";
      const value = contextLookup(identifier);

      if (!value || typeof value !== "object") {
        throw new Error("@class should reference an object");
      }

      const classAttr = attributes.find(([k, _]) => k === "class");
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
        attributes.push(["class", classes]);
      }
    } else if (attribute[0] === "@text") {
      // @text attribute
      const identifier = attribute[1] || "text";
      const value = contextLookup(identifier);

      if (kind === Kind.VOID) {
        throw new Error(
          "Void elements can't have textContent",
        );
      }

      if (value !== null && value !== undefined) {
        textContent.text = `${value}`;
      }
    } else if (attribute[0] === "@html") {
      // @html attribute
      const identifier = attribute[1] || "html";
      const value = contextLookup(identifier);

      if (kind === Kind.VOID) {
        throw new Error(
          "Void elements can't have innerHTML",
        );
      }

      if (value !== null && value !== undefined) {
        innerHTML.push(textNode(`${value}`));
      }
    } else if (attribute[0].startsWith("@bind")) {
      // @bind section
      const property = attribute[0].split(":")[1] as keyof typeof bindingConfig;

      if (!Object.keys(bindingConfig).includes(property)) {
        throw new Error(`${property} is not bindable`);
      }

      if (
        !bindingConfig[property].element.some((el) => tagName === el)
      ) {
        throw new Error(
          `@bind:${property} is not allowed on a ${tagName}`,
        );
      }

      const identifier = attribute[1] || property;
      const value = contextLookup(identifier);

      if (
        !bindingConfig[property].type.includes(typeof value)
      ) {
        throw new Error(
          `@bind:${property} should reference a value of type ${
            bindingConfig[property].type.join("|")
          }`,
        );
      }

      setAttribute(attributes, property, value);
    }
  }

  if (kind === Kind.VOID || !children) {
    return { tagName, kind, attributes };
  }

  if (textContent.text === "" && innerHTML.length === 0) {
    innerHTML = children.map(applyServerEffects);
  }

  if (kind === Kind.CUSTOM && context.at(-1)?.tagName === tagName) {
    context.pop();
  }

  return {
    tagName,
    kind,
    attributes,
    children: textContent.text !== ""
      ? template.length ? [...template, textContent] : [textContent]
      : template.length
      ? [...template, ...innerHTML]
      : innerHTML,
  };
}

export const serializeWebComponent = (
  component: ElementManifest,
): string => {
  context = [];

  if (component.kind === "custom-element") {
    throw new Error(`Element ${component.tagName} doesn't have a template`);
  }

  return serializeFragments(
    component.templateLoader().map(applyServerEffects),
  );
};

export const serializeRoute = (component: RouteManifest) => {
  return serializeFragments(component.templateLoader().map(applyServerEffects));
};
