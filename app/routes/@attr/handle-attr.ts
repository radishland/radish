import { HandlerRegistry } from "$runtime/handler-registry.js";
import { $state } from "$runtime/reactivity.js";

export class HandleAttr extends HandlerRegistry {
  state = $state("red");

  toggle() {
    this.state.value = this.state.value === "red" ? "green" : "red";
  }
}

if (window && !customElements.get("handle-attr")) {
  customElements.define("handle-attr", HandleAttr);
}
