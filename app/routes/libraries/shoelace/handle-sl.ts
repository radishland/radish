import { HandlerRegistry, signal } from "radish";

export class HandleSl extends HandlerRegistry {
  // Rating
  max = signal(5);
  precision = signal(1);
  readonly = signal(false);
  disabled = signal(false);
  value = signal(3);

  hover = (e: CustomEvent<{ value: number }>) => {
    if (!this.disabled.value && !this.readonly.value) {
      this.value.value = e.detail.value;
    }
  };
}

if (window && !customElements.get("handle-sl")) {
  customElements.define("handle-sl", HandleSl);
}
