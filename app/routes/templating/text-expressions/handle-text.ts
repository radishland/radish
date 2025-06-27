import { computed, HandlerRegistry, signal } from "@radish/runtime";

export class HandleText extends HandlerRegistry {
  a = signal(1);
  b = signal(2);
  c = computed(() => +(this.a.value) + +(this.b.value));

  pressed = signal(false);

  toggle() {
    this.pressed.value = !this.pressed.value;
  }
}

if (window && !customElements.get("handle-text")) {
  customElements.define("handle-text", HandleText);
}
