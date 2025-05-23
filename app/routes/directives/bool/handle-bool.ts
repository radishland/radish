import { HandlerRegistry, signal } from "@radish/runtime";

export class HandleBool extends HandlerRegistry {
  loading = signal(true);
  pill = signal(true);
  circle = signal(true);
}

if (window && !customElements.get("handle-bool")) {
  customElements.define("handle-bool", HandleBool);
}
