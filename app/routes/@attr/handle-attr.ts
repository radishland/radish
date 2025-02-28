import { HandlerRegistry } from "radish";
import { signal } from "radish";

export class HandleAttr extends HandlerRegistry {
  state = signal("red");

  toggle() {
    this.state.value = this.state.value === "red" ? "green" : "red";
  }
}

if (window && !customElements.get("handle-attr")) {
  customElements.define("handle-attr", HandleAttr);
}
