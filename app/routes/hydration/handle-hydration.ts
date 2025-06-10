import { HandlerRegistry } from "@radish/runtime";

export class HandleHydration extends HandlerRegistry {
  initial = 2;
}

if (window && !customElements.get("handle-hydration")) {
  customElements.define("handle-hydration", HandleHydration);
}
