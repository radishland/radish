import { HandlerRegistry } from "$runtime/handler-registry.js";

export class HandleEvents extends HandlerRegistry {
  constructor() {
    super();
  }

  clickHandler() {
    console.log("you clicked");
  }

  logEvent(e: PointerEvent) {
    console.log("logging the event", e);
  }

  hook1(element: HTMLElement) {
    const controller = new AbortController();
    console.log("adding hook1 on element", element);

    element.addEventListener("mouseover", () => {
      console.log("hovering");
    }, { signal: controller.signal });

    element.style.color = "red";

    return controller.abort;
  }
}

if (window && !customElements.get("handle-events")) {
  customElements.define("handle-events", HandleEvents);
}
