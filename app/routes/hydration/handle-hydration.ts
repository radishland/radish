import { HandlerRegistry } from "radish";

export class HandleHydration extends HandlerRegistry {
  div = document.querySelector("div");

  constructor() {
    super();
  }

  hello = () => {
    console.log("hello");
  };

  add = () => {
    const button = document.createElement("button");
    button.innerText = "click";
    button.setAttribute("on", "click:hello");

    this.div?.appendChild(button);
  };

  delete = () => {
    const child = this.div?.lastChild;
    if (child) {
      this.div?.removeChild(child);
    }
  };
}

if (window && !customElements.get("handle-hydration")) {
  customElements.define("handle-hydration", HandleHydration);
}
