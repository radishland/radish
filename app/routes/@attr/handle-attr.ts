import { HandlerRegistry } from "@radish/core/runtime";
import { $state } from "@radish/core/runtime";

export class HandleAttr extends HandlerRegistry {
  state = $state("red");

  toggle() {
    this.state.value = this.state.value === "red" ? "green" : "red";
  }
}

if (window && !customElements.get("handle-attr")) {
  customElements.define("handle-attr", HandleAttr);
}
