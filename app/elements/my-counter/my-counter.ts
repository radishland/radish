import { signal } from "@preact/signals-core";
import { HandlerRegistry } from "@radish/runtime";

export class MyCounter extends HandlerRegistry {
  #internals: ElementInternals;
  count = signal(0);

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.effect(() => {
      if (this.count.value % 2 === 0) {
        this.#internals.states.add("even");
      } else {
        this.#internals.states.delete("even");
      }
    });
  }

  increment = () => {
    this.count.value += 1;
  };
}

if (window && !customElements.get("my-counter")) {
  customElements.define("my-counter", MyCounter);
}
