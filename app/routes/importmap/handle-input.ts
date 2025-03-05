import { computed, HandlerRegistry } from "radish";
import { signal } from "radish";
import { round } from "ts-helpers/numbers";

export class HandleInput extends HandlerRegistry {
  importmap = signal("");
  number = signal(0);
  rounded = computed(() => round(this.number.value, 1));

  override connectedCallback() {
    super.connectedCallback();

    this.importmap.value =
      document.querySelector<HTMLScriptElement>("script[type='importmap']")
        ?.textContent ??
        "";
  }
}

if (window && !customElements.get("handle-input")) {
  customElements.define("handle-input", HandleInput);
}
