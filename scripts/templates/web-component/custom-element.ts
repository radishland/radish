import { HandlerRegistry } from "@radish/runtime";

export class CustomElement extends HandlerRegistry {
  // Your custom element's logic goes here
}

if (window && !customElements.get("custom-element")) {
  customElements.define("custom-element", CustomElement);
}
