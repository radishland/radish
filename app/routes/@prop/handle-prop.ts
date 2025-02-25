import { HandlerRegistry } from "@radish/core/runtime";
import { $computed, $state } from "@radish/core/runtime";

export class HandleProp extends HandlerRegistry {
  pressed = $state(false);
  color = $computed(() => this.pressed.value ? "green" : "red");

  toggleColor() {
    this.pressed.value = !this.pressed.value;
  }

  manageColor(node: HTMLElement) {
    this.$effect(() => {
      node.style.color = this.color.value;
    });
  }
}

if (window && !customElements.get("handle-prop")) {
  customElements.define("handle-prop", HandleProp);
}
