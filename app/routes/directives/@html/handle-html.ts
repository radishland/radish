import { HandlerRegistry } from "radish";
import { signal } from "radish";

export class HandleHtml extends HandlerRegistry {
  html = "<input type=checkbox>";
  htmlString = signal("");
  on = signal(false);

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
