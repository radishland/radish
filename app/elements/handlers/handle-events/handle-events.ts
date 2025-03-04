import { HandlerRegistry } from "radish";
import { signal } from "radish";

export class HandleEvents extends HandlerRegistry {
  state = signal(1);

  clickHandler() {
    console.log("you clicked");
  }

  logEvent(e: PointerEvent) {
    console.log("logging the event", e);
  }

  hook1(element: HTMLElement) {
    console.log("adding hook1 on element", element);

    element.addEventListener("mouseover", () => {
      console.log("hovering");
    }, this.abortController);

    element.style.color = "red";
  }
}

if (window && !customElements.get("handle-events")) {
  customElements.define("handle-events", HandleEvents);
}
