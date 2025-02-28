import { bindingConfig, booleanAttributes } from "./utils.ts";

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
  abortController: AbortController;

  constructor() {
    super();
    this.abortController = new AbortController();
  }

  /**
   * Creates an effect that is automatically cleaned up when the component is disconnected
   *
   * An optional AbortSignal can be provided to abort the effect prematurely
   */
  effect(callback: EffectCallback) {
    effect(callback, { signal: this.abortController.signal });
  }

  /**
   * Looks up an identifier on the instance
   */
  lookup(identifier: string): any {
    return this[identifier];
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
