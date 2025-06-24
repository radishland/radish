import { HandlerRegistry, signal } from "@radish/runtime";

export class HandleText extends HandlerRegistry {
  pressed = signal(false);

  toggle() {
    this.pressed.value = !this.pressed.value;
  }
}

if (window && !customElements.get("handle-text")) {
  customElements.define("handle-text", HandleText);
}
