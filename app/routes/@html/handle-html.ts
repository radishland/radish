import { HandlerRegistry } from "@radish/core/runtime";
import { $state } from "@radish/core/runtime";

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
