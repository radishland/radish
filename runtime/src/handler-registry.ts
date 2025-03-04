import {
  bindingConfig,
  booleanAttributes,
  spaces_sep_by_comma,
} from "./utils.ts";

import { effect, isState } from "./reactivity.ts";
import type {
  AttrRequestDetail,
  AutonomousCustomElement,
  BindRequestDetail,
  ClassRequestDetail,
  Destructor,
  EffectCallback,
  HTMLRequestDetail,
  OnRequestDetail,
  PropRequestDetail,
  TextRequestDetail,
  UseRequestDetail,
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
  abortController = new AbortController();

  constructor() {
    super();
    console.log(`${this.tagName} init`);
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

  #hydrateElement(element: Element) {
    const attributes = ["@attr", "@attr|client"]
      .map((item) => element?.getAttribute(item))
      .filter((attr) => attr !== null && attr !== undefined)
      .flatMap((attr) => attr.trim().split(spaces_sep_by_comma));

    for (const attribute of attributes) {
      const [key, value] = attribute.split(":");

      const attrRequest = new CustomEvent("@attr-request", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          attribute: key,
          identifier: value || key,
        },
      });

      element.dispatchEvent(attrRequest);
    }

    for (const property of Object.keys(bindingConfig)) {
      if (element.hasAttribute(`@bind:${property}`)) {
        const identifier = element.getAttribute(`@bind:${property}`)?.trim() ||
          property;

        const bindRequest = new CustomEvent("@bind-request", {
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: {
            property,
            identifier,
          },
        });

        element.dispatchEvent(bindRequest);
      }
    }

    const classList = element.getAttribute("@class");

    if (classList) {
      const classRequest = new CustomEvent("@class-request", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          identifier: classList,
        },
      });

      element.dispatchEvent(classRequest);
    }

    const html = element.getAttribute("@html");

    if (html) {
      const htmlRequest = new CustomEvent("@html-request", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          identifier: html,
        },
      });

      element.dispatchEvent(htmlRequest);
    }

    const events = element.getAttribute("@on")
      ?.trim().split(spaces_sep_by_comma);

    if (events) {
      for (const event of events) {
        const [type, handler] = event.split(":");

        const onRequest = new CustomEvent("@on-request", {
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: {
            type,
            handler: handler || type,
          },
        });

        element.dispatchEvent(onRequest);
      }
    }

    const props = element.getAttribute("@prop")
      ?.trim().split(spaces_sep_by_comma);

    if (props) {
      for (const prop of props) {
        const [key, value] = prop.split(":");

        const propRequest = new CustomEvent("@prop-request", {
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: {
            property: key,
            identifier: value || key,
          },
        });

        element.dispatchEvent(propRequest);
      }
    }

    const text = element.getAttribute("@text");

    if (text) {
      const textRequest = new CustomEvent("@text-request", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          identifier: text,
        },
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
            hook,
          },
        });

        element.dispatchEvent(useRequest);
      }
    }
  }

  hydrate(root: Node = this) {
    console.log(`${this.tagName} hydrating`);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

    let node: Node | null = walker.currentNode;
    // console.log(" element:", node);
    do {
      if ((node instanceof HandlerRegistry) && node !== this) {
        node.hydrate();
        node = walker.nextSibling() || walker.parentNode();
        // console.log(" skip to next element :", node);
        if (node !== this) continue;
        break;
      }

      if (node instanceof Element) {
        // console.log(node.tagName);
        this.#hydrateElement(node);

        if (node.shadowRoot) {
          // console.log("entering shadow root");
          this.hydrate(node.shadowRoot);
          // console.log("exiting shadow root");
        }
      }

      node = walker.nextNode();
      // console.log("next element:", node);
    } while (node);
  }

  #handleOn(e: Event) {
    if (e instanceof CustomEvent) {
      const { handler, type }: OnRequestDetail = e.detail;

      if (handler in this && typeof this.lookup(handler) === "function") {
        e.target?.addEventListener(type, this.lookup(handler).bind(this));
        e.stopPropagation();
      }
    }
  }

  #handleClass(e: Event) {
    const target = e.target;
    if (e instanceof CustomEvent && target) {
      const { identifier }: ClassRequestDetail = e.detail;

      if (identifier in this) {
        this.effect(() => {
          const classList = this.lookup(identifier)?.valueOf();
          if (classList && typeof classList === "object") {
            for (const [k, v] of Object.entries(classList)) {
              const force = !!(v?.valueOf());
              for (const className of k.split(" ")) {
                // @ts-ignore target is an HTMLElement
                target.classList.toggle(
                  className,
                  force,
                );
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
      const { hook }: UseRequestDetail = e.detail;

      if (hook in this && typeof this.lookup(hook) === "function") {
        const cleanup = this.lookup(hook).bind(this)(e.target);
        if (typeof cleanup === "function") {
          this.#cleanup.push(cleanup);
        }
        e.stopPropagation();
      }
    }
  }

  #handleAttr(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, attribute }: AttrRequestDetail = e.detail;
      const target = e.target;

      if (
        identifier in this && target instanceof HTMLElement &&
        attribute in target
      ) {
        const ref = this.lookup(identifier);

        this.effect(() => {
          if (booleanAttributes.includes(attribute)) {
            ref.valueOf()
              ? target.setAttribute(attribute, "")
              : target.removeAttribute(attribute);
          } else {
            target.setAttribute(attribute, `${ref}`);
          }
        });

        e.stopPropagation();
      }
    }
  }

  #handleProp(e: Event) {
    if (e instanceof CustomEvent) {
      const { identifier, property }: PropRequestDetail = e.detail;
      const target = e.target;

      if (identifier in this && target && property in target) {
        const ref = this.lookup(identifier);

        this.effect(() => {
          // @ts-ignore property is in target
          target[property] = ref.valueOf();
        });

        e.stopPropagation();
      }
    }
  }

  #handleText(e: Event) {
    if (e instanceof CustomEvent) {
      const target = e.target;

      const { identifier }: TextRequestDetail = e.detail;

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
      const { identifier }: HTMLRequestDetail = e.detail;
      const target = e.target;

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
      const { identifier, property }: BindRequestDetail = e.detail;
      const target = e.target;

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

  connectedCallback() {
    console.log(`${this.tagName} connected`);
    const { signal } = this.abortController;

    this.addEventListener("@attr-request", this.#handleAttr, { signal });
    this.addEventListener("@class-request", this.#handleClass, { signal });
    this.addEventListener("@on-request", this.#handleOn, { signal });
    this.addEventListener("@use-request", this.#handleUse, { signal });
    this.addEventListener("@prop-request", this.#handleProp, { signal });
    this.addEventListener("@html-request", this.#handleHTML, { signal });
    this.addEventListener("@text-request", this.#handleText, { signal });
    this.addEventListener("@bind-request", this.#handleBind, { signal });
  }

  disconnectedCallback() {
    this.abortController.abort();

    for (const cleanup of this.#cleanup) {
      cleanup();
    }
  }
}

customElements?.define("handler-registry", HandlerRegistry);
