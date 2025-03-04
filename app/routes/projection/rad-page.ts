import { HandlerRegistry } from "radish";

export class RadPage extends HandlerRegistry {
}

if (window && !customElements.get("rad-page")) {
  customElements.define("rad-page", RadPage);
}
