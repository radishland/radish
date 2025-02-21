import { HandleEvents } from "../handle-events/handle-events.ts";

export class HandleKeys extends HandleEvents {
  override clickHandler() {
    console.log("this handler is not called");
  }

  handleKey(e: Event) {
    console.log("you pressed", e);
  }
}

if (window && !customElements.get("handle-keys")) {
  customElements.define("handle-keys", HandleKeys);
}
