import { HandlerRegistry } from "radish";
import { signal } from "radish";

export class HandleBool extends HandlerRegistry {
  loading = signal(true);
  pill = signal(true);
  circle = signal(true);
}

if (window && !customElements.get("handle-bool")) {
  customElements.define("handle-bool", HandleBool);
}
