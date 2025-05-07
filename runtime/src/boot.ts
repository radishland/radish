import { assertExists } from "@std/assert";
import type {
  AttrRequestDetail,
  BindableProperty,
  BindRequestDetail,
  HandleRequestDetail,
  OnRequestDetail,
  PropRequestDetail,
} from "./types.d.ts";
import { bindingConfig, spaces_sep_by_comma } from "./utils.ts";

const hydrateElement = (element: Element) => {
  const attributes = [...element.attributes];

  const attr = attributes.filter((a) => a.localName.startsWith("attr:"));

  for (const attribute of attr) {
    const [_, key] = attribute.localName.split(":");

    assertExists(key);

    const attrRequest = new CustomEvent("rad::attr", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        attribute: key,
        identifier: attribute.value || key,
        target: element,
      } satisfies AttrRequestDetail,
    });

    element.dispatchEvent(attrRequest);
  }

  for (const property of Object.keys(bindingConfig)) {
    if (element.hasAttribute(`bind:${property}`)) {
      const identifier = element.getAttribute(`bind:${property}`)?.trim() ||
        property;

      const bindRequest = new CustomEvent("rad::bind", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          property: property as BindableProperty,
          identifier,
          target: element,
        } satisfies BindRequestDetail,
      });

      element.dispatchEvent(bindRequest);
    }
  }

  const bools = attributes.filter((a) => a.localName.startsWith("bool:"));

  for (const bool of bools) {
    const [_, key] = bool.localName.split(":");

    assertExists(key);

    element.dispatchEvent(
      new CustomEvent("rad::bool", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          attribute: key,
          identifier: bool.value || key,
          target: element,
        } satisfies AttrRequestDetail,
      }),
    );
  }

  const classList = element.getAttribute("classlist");

  if (classList) {
    const classRequest = new CustomEvent("rad::classlist", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        identifier: classList,
        target: element,
      } satisfies HandleRequestDetail,
    });

    element.dispatchEvent(classRequest);
  }

  const html = element.getAttribute("html");

  if (html) {
    const htmlRequest = new CustomEvent("rad::html", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        identifier: html,
        target: element,
      } satisfies HandleRequestDetail,
    });

    element.dispatchEvent(htmlRequest);
  }

  const events = attributes.filter((a) => a.localName.startsWith("on:"));

  for (const event of events) {
    const [_, type] = event.localName.split(":");

    assertExists(type);

    const onRequest = new CustomEvent("rad::on", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        type,
        identifier: event.value || type,
        target: element,
      } satisfies OnRequestDetail,
    });

    element.dispatchEvent(onRequest);
  }

  const props = attributes.filter((a) => a.localName.startsWith("prop:"));

  for (const prop of props) {
    const [_, key] = prop.localName.split(":");

    assertExists(key);

    const propRequest = new CustomEvent("rad::prop", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        property: key,
        identifier: prop.value || key,
        target: element,
      } satisfies PropRequestDetail,
    });

    element.dispatchEvent(propRequest);
  }

  const text = element.getAttribute("text");

  if (text) {
    const textRequest = new CustomEvent("rad::text", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        identifier: text,
        target: element,
      } satisfies HandleRequestDetail,
    });

    element.dispatchEvent(textRequest);
  }

  const hooks = element.getAttribute("@use")
    ?.trim().split(spaces_sep_by_comma);

  if (hooks) {
    for (const hook of hooks) {
      const useRequest = new CustomEvent("@use-request", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          identifier: hook,
          target: element,
        } satisfies HandleRequestDetail,
      });

      element.dispatchEvent(useRequest);
    }
  }
};

const hydrate = (root: Node) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let node: Node | null = walker.currentNode;

  do {
    if (node instanceof Element) {
      console.log(node.tagName);
      hydrateElement(node);

      if (node.shadowRoot) {
        console.log("entering shadow root");
        hydrate(node.shadowRoot);
        console.log("exiting shadow root");
      }
    }

    // console.log("next element:", node);
  } while ((node = walker.nextNode()));
};

customElements?.whenDefined("handler-registry").then(() => {
  hydrate(document.body);
});
