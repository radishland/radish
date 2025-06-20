import { signal } from "@preact/signals-core";
import { HandlerRegistry } from "@radish/runtime";

// TODO: to avoid the hydration flash, set a  attribute on the server for client-rendered r-show

export class RMatch extends HandlerRegistry {
  #internals: ElementInternals;
  when = signal(false);

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.effect(() => {
      if (this.when.value) {
        this.#internals.states.add("match");
      } else {
        this.#internals.states.delete("match");
      }
    });
  }
}

if (window && !customElements.get("r-match")) {
  customElements.define("r-match", RMatch);
}
