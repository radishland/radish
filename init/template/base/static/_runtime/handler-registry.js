import { booleanAttributes } from "./utils.js";
import { bindingConfig } from "./config.js";

import { $effect, getValue, isComputed, isState } from "./reactivity.js";

export class HandlerRegistry extends HTMLElement {
  #cleanup = [];

  abortController;

  constructor() {
    super();
    this.abortController = new AbortController();
  }

  $effect(cb, options) {
    const signals = [this.abortController.signal];
    if (options?.signal) signals.push(options.signal);

    $effect(cb, { ...options, signal: AbortSignal.any(signals) });
  }

  #handleOn(e) {
    if (e instanceof CustomEvent) {
      const { handler, type } = e.detail;

      if (handler in this && typeof this[handler] === "function") {
        e.target?.addEventListener(type, this[handler].bind(this));
        e.stopPropagation();
      }
    }
  }

  #handleClass(e) {
    if (e instanceof CustomEvent) {
      const { identifier } = e.detail;

      if (identifier in this) {
        this.$effect(() => {
          const classList = getValue(this[identifier]);
          if (classList && typeof classList === "object") {
            for (const [k, v] of Object.entries(classList)) {
              const force = !!getValue(v);
              for (const className of k.split(" ")) {
                e.target.classList.toggle(className, force);
              }
            }
          }
        });

        e.stopPropagation();
      }
    }
  }

  #handleUse(e) {
    if (e instanceof CustomEvent) {
      const { hook } = e.detail;

      if (hook in this && typeof this[hook] === "function") {
        const cleanup = this[hook](e.target);
        if (typeof cleanup === "function") {
          this.#cleanup.push(cleanup);
        }
        e.stopPropagation();
      }
    }
  }

  #handleAttr(e) {
    if (e instanceof CustomEvent) {
      const { identifier, attribute } = e.detail;
      const target = e.target;

      if (
        identifier in this && target instanceof HTMLElement &&
        attribute in target
      ) {
        const ref = this[identifier];

        const setAttr = () => {
          const value = getValue(ref);
          if (booleanAttributes.includes(attribute)) {
            value
              ? target.setAttribute(attribute, "")
              : target.removeAttribute(attribute);
          } else {
            target.setAttribute(attribute, `${value}`);
          }
        };

        if (isState(ref) || isComputed(ref)) {
          this.$effect(() => setAttr());
        } else {
          setAttr();
        }

        e.stopPropagation();
      }
    }
  }

  #handleProp(e) {
    if (e instanceof CustomEvent) {
      const { identifier, property } = e.detail;
      const target = e.target;

      if (identifier in this && target && property in target) {
        const ref = this[identifier];

        const setProp = () => {
          const value = getValue(ref);
          target[property] = value;
        };

        if (isState(ref) || isComputed(ref)) {
          this.$effect(() => setProp());
        } else {
          setProp();
        }

        e.stopPropagation();
      }
    }
  }

  #handleText(e) {
    if (e instanceof CustomEvent) {
      const target = e.target;
      const { identifier } = e.detail;

      if (identifier in this && target instanceof HTMLElement) {
        const ref = this[identifier];

        const setTextContent = () => {
          const value = getValue(ref);
          target.textContent = `${value}`;
        };

        if (isState(ref) || isComputed(ref)) {
          this.$effect(() => setTextContent());
        } else {
          setTextContent();
        }

        e.stopPropagation();
      }
    }
  }

  #handleHTML(e) {
    if (e instanceof CustomEvent) {
      const { identifier } = e.detail;
      const target = e.target;

      if (identifier in this && target instanceof HTMLElement) {
        const ref = this[identifier];

        const setInnerHTML = () => {
          const value = getValue(ref);
          target.innerHTML = `${value}`;
        };

        if (isState(ref) || isComputed(ref)) {
          this.$effect(() => setInnerHTML());
        } else {
          setInnerHTML();
        }

        e.stopPropagation();
      }
    }
  }

  #handleBind(e) {
    if (e instanceof CustomEvent) {
      const { identifier, property } = e.detail;
      const target = e.target;

      if (
        identifier in this && target instanceof HTMLElement &&
        property in target
      ) {
        const state = this[identifier];
        if (isState(state)) {
          state.value = target[property];

          target.addEventListener(bindingConfig[property].event, () => {
            state.value = target[property];
          });

          this.$effect(() => {
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

if (window && !customElements.get("handler-registry")) {
  customElements.define("handler-registry", HandlerRegistry);
}
