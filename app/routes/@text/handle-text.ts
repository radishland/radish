import { HandlerRegistry } from "$runtime/handler-registry.js";
import { $computed, $state } from "$runtime/reactivity.js";

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
