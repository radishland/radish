import { computed, reactive, signal } from "radish";
import { HandlerRegistry } from "radish";

export class HandleState extends HandlerRegistry {
  count = signal(0);
  checked = computed(() => this.count.value % 2 === 0);
  name = signal("");
  interval = signal(0);
  state = reactive({
    name: "fred",
  });
  input_value = computed(() => this.state.name);

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
