import { HandlerRegistry } from "radish";

export class MyComponent extends HandlerRegistry {
}

if (window && !customElements.get("my-component")) {
  customElements.define("my-component", MyComponent);
}
