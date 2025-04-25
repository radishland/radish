import { computed, HandlerRegistry, signal } from "radish";
import { round } from "ts-helpers/numbers";
import { toSnakeCase } from "@std/text/to-snake-case";

export class HandleInput extends HandlerRegistry {
  importmap = signal("");

  number = signal(0);
  rounded = computed(() => round(this.number.value, 1));

  text = signal("");
  snaked = computed(() => toSnakeCase(this.text.value));

  override connectedCallback() {
    super.connectedCallback();

    this.importmap.value = JSON.stringify(
      JSON.parse(
        document.querySelector<HTMLScriptElement>("script[type='importmap']")
          ?.textContent ??
          "",
      ),
      null,
      2,
    );
  }
}

if (window && !customElements.get("handle-input")) {
  customElements.define("handle-input", HandleInput);
}
