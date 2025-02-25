import { HandlerRegistry } from "@radish/core/runtime";

export class TestShadowroot extends HandlerRegistry {}

if (window && !customElements.get("test-shadowroot")) {
  customElements.define("test-shadowroot", TestShadowroot);
}
