import { HandlerRegistry, signal } from "$runtime";

export class MyComponent extends HandlerRegistry {
  state = signal(0);

  increment = () => {
    this.state.value++;
  };

  decrement = () => {
    this.state.value--;
  };
}

if (window && !customElements.get("my-component")) {
  customElements.define("my-component", MyComponent);
}
