import { bindingConfig, booleanAttributes } from "./utils.ts";

import { effect, isState } from "./reactivity.ts";
import type {
  AutonomousCustomElement,
  Destructor,
  EffectCallback,
  HandleDirectiveEvent,
  HandleDirectiveEventDetail,
} from "./types.d.ts";

/**
 * A Scoped Handler Registry implements the logic for handling effect requests.
 *
 * Extend this class by adding new methods in your subclass to implement your own effect handlers
 */
export class HandlerRegistry extends HTMLElement
  implements AutonomousCustomElement {
  [key: string]: any;

  #cleanup: Destructor[] = [];

  /**
   * References the handler's `AbortController`.
   *
   * The `abort` method of the controller is called in the `disconnectedCallback` method. It allows to cleanup event handlers and other abortable operations
   */
  abortController: AbortController = new AbortController();

  constructor() {
    super();
  }

  /**
   * Creates an effect that is automatically cleaned up when the component is disconnected
   *
   * An optional AbortSignal can be provided to abort the effect prematurely
   */
  effect(callback: EffectCallback) {
    effect(callback, this.abortController);
  }

  /**
   * Looks up an identifier on the instance
   */
  lookup(identifier: string): any {
    return this[identifier];
  }

  #handleAttr(e: HandleDirectiveEvent) {
    const { identifier, key, target } = e.detail;

    if (
      identifier in this && target instanceof HTMLElement &&
      key in target
    ) {
      const ref = this.lookup(identifier);

      this.effect(() => {
        if (booleanAttributes.includes(key)) {
          target.toggleAttribute(key, ref.valueOf());
        } else {
          target.setAttribute(key, `${ref}`);
        }
      });

      target.removeAttribute("attr:" + key);
      e.stopPropagation();
    }
  }

  #handleBool(e: HandleDirectiveEvent) {
    const { identifier, key, target } = e.detail;

    if (identifier in this && target instanceof HTMLElement) {
      const ref = this.lookup(identifier);

      this.effect(() => {
        target.toggleAttribute(key, ref.valueOf());
      });

      target.removeAttribute("bool:" + key);
      e.stopPropagation();
    }
  }

  #handleOn(e: HandleDirectiveEvent) {
    const { identifier, key, target } = e.detail;

    if (
      identifier in this && target instanceof HTMLElement &&
      typeof this.lookup(identifier) === "function"
    ) {
      target.addEventListener(key, this.lookup(identifier).bind(this));

      target.removeAttribute("on:" + key);
      e.stopPropagation();
    }
  }

  #handleClass(e: HandleDirectiveEvent) {
    const { identifier, target } = e.detail;

    if (identifier in this && target instanceof HTMLElement) {
      this.effect(() => {
        const classList = this.lookup(identifier)?.valueOf();
        if (
          target instanceof HTMLElement &&
          classList &&
          typeof classList === "object"
        ) {
          for (const [k, v] of Object.entries(classList)) {
            const force = !!(v?.valueOf());
            for (const className of k.split(" ")) {
              target.classList.toggle(className, force);
            }
          }
        }
      });

      target.removeAttribute("classList");
      e.stopPropagation();
    }
  }

  #handleUse(e: HandleDirectiveEvent) {
    const { key, target } = e.detail;

    if (
      key in this && typeof this.lookup(key) === "function" &&
      target instanceof HTMLElement
    ) {
      const cleanup = this.lookup(key).bind(this)(target);
      if (typeof cleanup === "function") {
        this.#cleanup.push(cleanup);
      }

      target.removeAttribute("use:" + key);
      e.stopPropagation();
    }
  }

  #handleProp(e: HandleDirectiveEvent) {
    const { identifier, key, target } = e.detail;

    if (
      identifier in this && key in target &&
      target instanceof HTMLElement
    ) {
      const ref = this.lookup(identifier);

      this.effect(() => {
        // @ts-ignore property is in target
        if (isState(target[key])) {
          // @ts-ignore property is in target
          target[key].value = ref.valueOf();
        } else {
          // @ts-ignore property is in target
          target[key] = ref.valueOf();
        }
      });

      target.removeAttribute("prop:" + key);
      e.stopPropagation();
    }
  }

  #handleText(e: HandleDirectiveEvent) {
    const { identifier, target } = e.detail;

    if (identifier in this && target instanceof HTMLElement) {
      const ref = this.lookup(identifier);

      this.effect(() => {
        target.textContent = `${ref}`;
      });

      target.removeAttribute("text");
      e.stopPropagation();
    }
  }

  #handleHTML(e: HandleDirectiveEvent) {
    const { identifier, target } = e.detail;

    if (identifier in this && target instanceof HTMLElement) {
      const ref = this.lookup(identifier);

      this.effect(() => {
        target.innerHTML = `${ref}`;
      });

      target.removeAttribute("html");
      e.stopPropagation();
    }
  }

  #handleBind(e: HandleDirectiveEvent) {
    const { identifier, key, target } = e.detail;

    if (
      identifier in this && target instanceof HTMLElement &&
      key in target
    ) {
      const state = this.lookup(identifier);
      if (isState(state)) {
        // @ts-ignore property is in target
        state.value = target[key];

        // Add change listener
        target.addEventListener(
          bindingConfig[key as keyof typeof bindingConfig].event,
          () => {
            // @ts-ignore property is in target
            state.value = target[key];
          },
        );

        // Sync
        this.effect(() => {
          // @ts-ignore property is in target
          target[key] = state.value;
        });
      }

      target.removeAttribute("bind:" + key);
      e.stopPropagation();
    }
  }

  hydrateElement(element: Element) {
    console.log(`hydrating element ${element.nodeName}`);
    const attributes = [...element.attributes];

    const attr = attributes.filter((a) => a.localName.startsWith("attr:"));

    for (const attribute of attr) {
      const [_, key] = attribute.localName.split(":");

      if (!key) throw new Error("Missing <key> in attr:<key>");

      const attrRequest = new CustomEvent("rad::attr", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          key,
          identifier: attribute.value || key,
          target: element,
        } satisfies HandleDirectiveEventDetail,
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
            key: property,
            identifier,
            target: element,
          } satisfies HandleDirectiveEventDetail,
        });

        element.dispatchEvent(bindRequest);
      }
    }

    const bools = attributes.filter((a) => a.localName.startsWith("bool:"));

    for (const bool of bools) {
      const [_, key] = bool.localName.split(":");

      if (!key) throw new Error("Missing <key> in bool:<key>");

      element.dispatchEvent(
        new CustomEvent("rad::bool", {
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: {
            key,
            identifier: bool.value || key,
            target: element,
          } satisfies HandleDirectiveEventDetail,
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
          key: "classList",
          target: element,
        } satisfies HandleDirectiveEventDetail,
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
          key: "innerHTML",
          target: element,
        } satisfies HandleDirectiveEventDetail,
      });

      element.dispatchEvent(htmlRequest);
    }

    const events = attributes.filter((a) => a.localName.startsWith("on:"));

    for (const event of events) {
      const [_, type] = event.localName.split(":");

      if (!type) throw new Error("Missing <type> in on:<type>");

      const onRequest = new CustomEvent("rad::on", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          key: type,
          identifier: event.value || type,
          target: element,
        } satisfies HandleDirectiveEventDetail,
      });

      element.dispatchEvent(onRequest);
    }

    const props = attributes.filter((a) => a.localName.startsWith("prop:"));

    for (const prop of props) {
      const [_, key] = prop.localName.split(":");

      if (!key) throw new Error("Missing <key> in prop:<key>");

      const propRequest = new CustomEvent("rad::prop", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          key,
          identifier: prop.value || key,
          target: element,
        } satisfies HandleDirectiveEventDetail,
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
          key: "textContent",
          target: element,
        } satisfies HandleDirectiveEventDetail,
      });

      element.dispatchEvent(textRequest);
    }

    const hooks = attributes.filter((a) => a.localName.startsWith("use:"));

    for (const hook of hooks) {
      const [_, identifier] = hook.localName.split(":");

      if (!identifier) throw new Error("Missing <id> in use:<id>");

      const useRequest = new CustomEvent("rad::use", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          key: identifier,
          identifier: "",
          target: element,
        } satisfies HandleDirectiveEventDetail,
      });

      element.dispatchEvent(useRequest);
    }
  }

  // TODO: tree aware hydration that filters out HandlerRegistries and parallelize
  hydrate(node: Node = this) {
    if (node instanceof Element) {
      // Perf: add hydration marker on the server and filter nodes that need hydration
      this.hydrateElement(node);

      if (node.shadowRoot && node.shadowRoot.mode === "open") {
        console.log("entering shadow root");
        this.hydrate(node.shadowRoot);
        console.log("exiting shadow root");
      }
    }

    let child = node.firstChild;
    while (child) {
      this.hydrate(child);
      child = child.nextSibling;
    }
  }

  connectedCallback() {
    console.log(`[connectedCallback]: ${this.tagName}`);
    const { signal } = this.abortController;

    this.addEventListener("rad::attr", this.#handleAttr, { signal });
    this.addEventListener("rad::bind", this.#handleBind, { signal });
    this.addEventListener("rad::bool", this.#handleBool, { signal });
    this.addEventListener("rad::classlist", this.#handleClass, { signal });
    this.addEventListener("rad::html", this.#handleHTML, { signal });
    this.addEventListener("rad::on", this.#handleOn, { signal });
    this.addEventListener("rad::prop", this.#handleProp, { signal });
    this.addEventListener("rad::text", this.#handleText, { signal });
    this.addEventListener("rad::use", this.#handleUse, { signal });
  }

  disconnectedCallback() {
    this.abortController.abort();

    for (const cleanup of this.#cleanup) {
      cleanup();
    }
  }
}

if (window && !customElements.get("handler-registry")) {
  customElements?.define("handler-registry", HandlerRegistry);
}

customElements?.whenDefined("handler-registry").then(() => {
  const tw = document.createTreeWalker(
    document,
    NodeFilter.SHOW_ELEMENT,
    (node) => {
      return node instanceof HandlerRegistry
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  );
  let current: Node | null = tw.firstChild();

  while (current) {
    if (current instanceof HandlerRegistry) {
      current.hydrate();
    }
    current = tw.nextNode();
  }
});
