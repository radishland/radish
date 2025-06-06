import { HandlerRegistry, signal } from "@radish/runtime";

export class HandleShow extends HandlerRegistry {
  condition = signal(false);
}

if (window && !customElements.get("handle-show")) {
  customElements.define("handle-show", HandleShow);
}
