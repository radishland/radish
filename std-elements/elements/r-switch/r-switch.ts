import { HandlerRegistry } from "@radish/runtime";
import type { RMatch } from "../r-match/r-match.ts";

// TODO: to avoid the hydration flash, set a  attribute on the server for client-rendered r-show

export class RSwitch extends HandlerRegistry {
  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.effect(() => {
      const matches = [...this.querySelectorAll<RMatch>("& > r-match")];

      if (matches.some((m) => m.when.value)) {
        this.#internals.states.add("match");
      } else {
        this.#internals.states.delete("match");
      }
    });
  }
}

if (window && !customElements.get("r-switch")) {
  customElements.define("r-switch", RSwitch);
}
