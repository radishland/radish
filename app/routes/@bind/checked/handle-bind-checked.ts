import { HandlerRegistry } from "$runtime/handler-registry.js";
import { $state } from "$runtime/reactivity.js";

export class HandleBindChecked extends HandlerRegistry {
  // Checked
  checked = $state(true);
  inspectChecked() {
    console.log("checked", this.checked.value);
  }
  turnOn() {
    this.checked.value = true;
  }
  turnOff() {
    this.checked.value = false;
  }
}

if (window && !customElements.get("handle-bind-checked")) {
  customElements.define("handle-bind-checked", HandleBindChecked);
}
