import { signal } from "@preact/signals-core";
import { HandlerRegistry } from "@radish/runtime";

// TODO: to avoid the hydration flash, set a `when` attribute on the server for client-rendered r-show

export class RShow extends HandlerRegistry {
  #internals: ElementInternals;
  if = signal(false);

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.effect(() => {
      if (this.if.value) {
        this.#internals.states.add("show");
      } else {
        this.#internals.states.delete("show");
      }
    });
  }
}

if (window && !customElements.get("r-show")) {
  customElements.define("r-show", RShow);
}
