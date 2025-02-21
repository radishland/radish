import { HandlerRegistry } from "$runtime/handler-registry.js";

export class TestShadowroot extends HandlerRegistry {}

if (window && !customElements.get("test-shadowroot")) {
  customElements.define("test-shadowroot", TestShadowroot);
}
