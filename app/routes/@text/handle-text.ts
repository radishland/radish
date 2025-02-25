import { HandlerRegistry } from "@radish/core/runtime";
import { $computed, $state } from "@radish/core/runtime";

export class HandleText extends HandlerRegistry {
  on = $state(false);
  text = $computed(() => this.on.value ? "with" : "without");

  toggle() {
    this.on.value = !this.on.value;
  }
}

if (window && !customElements.get("handle-text")) {
  customElements.define("handle-text", HandleText);
}
