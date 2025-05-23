import { HandlerRegistry } from "@radish/runtime";

export class RadPage extends HandlerRegistry {
}

if (window && !customElements.get("rad-page")) {
  customElements.define("rad-page", RadPage);
}
