import { HandlerRegistry } from "$runtime/handler-registry.js";
import { $effect, $state } from "$runtime/reactivity.js";

export class MyInvoke extends HandlerRegistry {
  state = $state(0);

  constructor() {
    super();
  }

  override connectedCallback() {
    super.connectedCallback();

    this.addEventListener(
      "command",
      (e: any /* CommandEvent */) => {
        console.log("command", e);
        const command = e.command.slice(2);

        if (command === "increment") {
          this.state.value += 1;
          console.log("increment", this.state.value);
        } else if (command === "decrement") {
          this.state.value -= 1;
          console.log("decrement", this.state.value);
        }
      },
    );
  }

  updateText(node: HTMLElement) {
    return $effect(() => {
      node.textContent = `${this.state.value}`;
    });
  }
}

if (window && !customElements.get("my-invoke")) {
  customElements.define("my-invoke", MyInvoke);
}
