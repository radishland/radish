import { bindingConfig, booleanAttributes } from "./utils.ts";

import { effect, isState } from "./reactivity.ts";
import type {
  AttrRequestDetail,
  AutonomousCustomElement,
  BindableProperty,
  BindRequestDetail,
  Destructor,
  EffectCallback,
  HandleRequestDetail,
  OnRequestDetail,
  PropRequestDetail,
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

  #handleAttr(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, attribute, target }: AttrRequestDetail = e.detail;

      if (
        identifier in this && target instanceof HTMLElement &&
        attribute in target
      ) {
        const ref = this.lookup(identifier);

        this.effect(() => {
          if (booleanAttributes.includes(attribute)) {
            target.toggleAttribute(attribute, ref.valueOf());
          } else {
            target.setAttribute(attribute, `${ref}`);
          }
        });

        e.stopPropagation();
      }
    }
  }

  #handleBool(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, attribute, target }: AttrRequestDetail = e.detail;

      if (identifier in this && target instanceof HTMLElement) {
        const ref = this.lookup(identifier);

        this.effect(() => {
          target.toggleAttribute(attribute, ref.valueOf());
        });

        e.stopPropagation();
      }
    }
  }

  #handleOn(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, type, target }: OnRequestDetail = e.detail;

      if (identifier in this && typeof this.lookup(identifier) === "function") {
        target.addEventListener(type, this.lookup(identifier).bind(this));
        e.stopPropagation();
      }
    }
  }

  #handleClass(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, target }: HandleRequestDetail = e.detail;

      if (identifier in this) {
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

        e.stopPropagation();
      }
    }
  }

  #handleUse(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, target }: HandleRequestDetail = e.detail;

      if (identifier in this && typeof this.lookup(identifier) === "function") {
        const cleanup = this.lookup(identifier).bind(this)(target);
        if (typeof cleanup === "function") {
          this.#cleanup.push(cleanup);
        }
        e.stopPropagation();
      }
    }
  }

  #handleProp(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, property, target }: PropRequestDetail = e.detail;

      if (identifier in this && property in target) {
        const ref = this.lookup(identifier);

        this.effect(() => {
          // @ts-ignore property is in target
          if (isState(target[property])) {
            // @ts-ignore property is in target
            target[property].value = ref.valueOf();
          } else {
            // @ts-ignore property is in target
            target[property] = ref.valueOf();
          }
        });

        e.stopPropagation();
      }
    }
  }

  #handleText(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, target }: HandleRequestDetail = e.detail;

      if (identifier in this && target instanceof HTMLElement) {
        const ref = this.lookup(identifier);

        this.effect(() => {
          target.textContent = `${ref}`;
        });

        e.stopPropagation();
      }
    }
  }

  #handleHTML(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, target }: HandleRequestDetail = e.detail;

      if (identifier in this && target instanceof HTMLElement) {
        const ref = this.lookup(identifier);

        this.effect(() => {
          target.innerHTML = `${ref}`;
        });

        e.stopPropagation();
      }
    }
  }

  #handleBind(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, property, target }: BindRequestDetail = e.detail;

      if (
        identifier in this && target instanceof HTMLElement &&
        property in target
      ) {
        const state = this.lookup(identifier);
        if (isState(state)) {
          // @ts-ignore property is in target
          state.value = target[property];

          // Add change listener
          target.addEventListener(bindingConfig[property].event, () => {
            // @ts-ignore property is in target
            state.value = target[property];
          });

          // Sync
          this.effect(() => {
            // @ts-ignore property is in target
            target[property] = state.value;
          });
        }

        e.stopPropagation();
      }
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

      if (!key) throw new Error("Missing <key> in bool:<key>");

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

      if (!type) throw new Error("Missing <type> in on:<type>");

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

      if (!key) throw new Error("Missing <key> in prop:<key>");

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

    const hooks = attributes.filter((a) => a.localName.startsWith("use:"));

    for (const hook of hooks) {
      const [_, identifier] = hook.localName.split(":");

      if (!identifier) throw new Error("Missing <id> in use:<id>");

      const useRequest = new CustomEvent("rad::use", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          identifier,
          target: element,
        } satisfies HandleRequestDetail,
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
  const first: Node | null = tw.firstChild();

  if (first instanceof HandlerRegistry) {
    first.hydrate();
  }
});
