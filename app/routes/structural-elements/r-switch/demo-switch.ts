import { HandlerRegistry, signal } from "@radish/runtime";

export class DemoSwitch extends HandlerRegistry {
  condition1 = signal(true);
  condition2 = signal(false);
  condition3 = signal(false);
}

if (window && !customElements.get("demo-switch")) {
  customElements.define("demo-switch", DemoSwitch);
}
