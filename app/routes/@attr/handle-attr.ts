import { HandlerRegistry } from "radish/runtime";
import { $state } from "radish/runtime";

export class HandleAttr extends HandlerRegistry {
  state = $state("red");

  toggle() {
    this.state.value = this.state.value === "red" ? "green" : "red";
  }
}

if (window && !customElements.get("handle-attr")) {
  customElements.define("handle-attr", HandleAttr);
}
