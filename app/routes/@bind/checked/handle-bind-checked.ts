import { HandlerRegistry } from "radish";
import { signal } from "radish";

export class HandleBindChecked extends HandlerRegistry {
  // Checked
  checked = signal(true);
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
