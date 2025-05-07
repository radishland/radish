import { bindingConfig, booleanAttributes } from "./utils.ts";

import { effect, isState } from "./reactivity.ts";
import type {
  AttrRequestDetail,
  AutonomousCustomElement,
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
          target[property] = ref.valueOf();
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

  connectedCallback() {
    console.log(`${this.tagName} connected`);
    const { signal } = this.abortController;

    this.addEventListener("rad::attr", this.#handleAttr, { signal });
    this.addEventListener("rad::bool", this.#handleBool, { signal });
    this.addEventListener("rad::class", this.#handleClass, { signal });
    this.addEventListener("rad::on", this.#handleOn, { signal });
    this.addEventListener("rad::use", this.#handleUse, { signal });
    this.addEventListener("rad::prop", this.#handleProp, { signal });
    this.addEventListener("rad::html", this.#handleHTML, { signal });
    this.addEventListener("rad::text", this.#handleText, { signal });
    this.addEventListener("rad::bind", this.#handleBind, { signal });
  }

  disconnectedCallback() {
    this.abortController.abort();

    for (const cleanup of this.#cleanup) {
      cleanup();
    }
  }
}

customElements?.define("handler-registry", HandlerRegistry);
