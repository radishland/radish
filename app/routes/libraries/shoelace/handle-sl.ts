import { HandlerRegistry, signal } from "radish";

export class HandleSl extends HandlerRegistry {
  // Button
  "btn-text" = signal("Click");
  handleClick = () => {
    console.log("click");
  };

  // Rating
  max = signal(5);
  precision = signal(1);
  readonly = signal(false);
  disabled = signal(false);
  value = signal(0);

  hover = (e: CustomEvent<{ value: number }>) => {
    console.log("hover!");
    this.value.value = e.detail.value;
  };
}

if (window && !customElements.get("handle-sl")) {
  customElements.define("handle-sl", HandleSl);
}
