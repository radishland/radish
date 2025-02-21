import { HandlerRegistry } from "$runtime/handler-registry.js";
import { $state } from "$runtime/reactivity.js";

export class HandleHtml extends HandlerRegistry {
  html = "<input type=checkbox>";
  htmlString = $state("");
  on = $state(false);

  toggle() {
    this.on.value = !this.on.value;
  }

  commit() {
    const value = this.querySelector("textarea")?.value;
    if (value) {
      this.htmlString.value = value;
    }
  }
}

if (window && !customElements.get("handle-html")) {
  customElements.define("handle-html", HandleHtml);
}
