import { HandlerRegistry } from "@radish/runtime";
import { signal } from "@preact/signals-core";

export class HandleHook extends HandlerRegistry {
  count = signal(0);

  hook() {
    console.log("hooked");

    this.querySelector("button")?.addEventListener("click", () => {
      this.count.value += 1;
    });
  }
}

if (window && !customElements.get("handle-hook")) {
  customElements.define("handle-hook", HandleHook);
}
