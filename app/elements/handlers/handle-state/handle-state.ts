import { $computed, $object, $state } from "radish/runtime";
import { HandlerRegistry } from "radish/runtime";

export class HandleState extends HandlerRegistry {
  count = $state(0);
  checked = $computed(() => this.count.value % 2 === 0);
  name = $state("");
  interval = $state(0);
  state = $object({
    name: "fred",
  });
  input_value = $computed(() => this.state.name);

  increment() {
    this.count.value++;
    console.log("state", this.count.value);
  }

  input(e: InputEvent) {
    console.log(e);
    this.state.name = (e.target as HTMLInputElement).value;
  }

  hookInterval() {
    const interval = setInterval(() => {
      console.log("tick");
      this.interval.value++;
    }, 1000);

    return () => {
      console.log("cleanup");
      clearInterval(interval);
    };
  }
}

if (window && !customElements.get("handle-state")) {
  customElements.define("handle-state", HandleState);
}
