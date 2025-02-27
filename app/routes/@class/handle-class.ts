import { HandlerRegistry, reactive } from "radish/runtime";
import { signal } from "radish/runtime";

export class HandleClass extends HandlerRegistry {
  outline = signal(false);

  state = signal({
    "red": true,
    "outline": this.outline,
  });

  object = reactive({
    "red": false,
    "outline": this.outline,
  });

  toggleStateColor() {
    this.state.value = {
      ...this.state.value,
      "red": !this.state.value["red"],
    };
  }

  toggleObjectColor() {
    this.object.red = !this.object.red;
  }

  toggleOutline() {
    this.outline.value = !this.outline.value;
  }
}

if (window && !customElements.get("handle-class")) {
  customElements.define("handle-class", HandleClass);
}
