import { HandlerRegistry } from "radish";
import { signal } from "radish";

export class RadProjection extends HandlerRegistry {
  h2 = signal("subtitle");

  toggle = () => {
    this.h2.value = this.h2.value === "subtitle" ? "description" : "subtitle";
  };

  say = () => {
    console.log("bonjour");
  };

  constructor() {
    super();
  }
}

if (window && !customElements.get("rad-projection")) {
  customElements.define("rad-projection", RadProjection);
}
