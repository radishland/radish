import { HandlerRegistry } from "radish/runtime";
import { $state } from "radish/runtime";

export class TestBind extends HandlerRegistry {
  type = "text";
  value = $state("b");

  undefined_value = undefined;
  undefined_signal = $state(undefined);

  true = true;
  false = false;
  signal_true = $state(true);
  signal_false = $state(false);

  content_signal = $state(0);
}

if (window && !customElements.get("test-bind")) {
  customElements.define("test-bind", TestBind);
}
