import { HandlerRegistry } from "radish/runtime";
import { $computed, signal } from "radish/runtime";

export class HandleText extends HandlerRegistry {
  on = signal(false);
  text = $computed(() => this.on.value ? "with" : "without");

  toggle() {
    this.on.value = !this.on.value;
  }
}

if (window && !customElements.get("handle-text")) {
  customElements.define("handle-text", HandleText);
}
