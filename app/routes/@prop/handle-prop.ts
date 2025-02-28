import { HandlerRegistry } from "radish/runtime";
import { computed, signal } from "radish/runtime";

export class HandleProp extends HandlerRegistry {
  pressed = signal(false);
  color = computed(() => this.pressed.value ? "green" : "red");

  toggleColor() {
    this.pressed.value = !this.pressed.value;
  }

  manageColor(node: HTMLElement) {
    this.effect(() => {
      node.style.color = this.color.value;
    });
  }
}

if (window && !customElements.get("handle-prop")) {
  customElements.define("handle-prop", HandleProp);
}
