import { HandlerRegistry } from "radish/runtime";
import { signal } from "radish/runtime";

export class TestBind extends HandlerRegistry {
  type = "text";
  value = signal("b");

  undefined_value = undefined;
  undefined_signal = signal(undefined);

  true = true;
  false = false;
  signal_true = signal(true);
  signal_false = signal(false);

  content_signal = signal(0);
}

if (window && !customElements.get("test-bind")) {
  customElements.define("test-bind", TestBind);
}
