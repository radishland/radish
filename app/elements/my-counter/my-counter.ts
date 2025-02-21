export class MyCounter extends HTMLElement {
  static observedAttributes = ["count"];

  #internals;

  constructor() {
    super();

    this.#internals = this.attachInternals();
  }

  connectedCallback() {
    console.log("connected");
    this.shadowRoot
      ?.querySelector("button")
      ?.addEventListener("click", this.increment);
  }

  disconnectedCallback() {
    console.log("disconnected");
    this.shadowRoot
      ?.querySelector("button")
      ?.removeEventListener("click", this.increment);
  }

  attributeChangedCallback(name: string, prev: string, next: string) {
    console.log("attribute changed", name, prev, next);
    this.even = +next % 2 === 0;
    console.log("even", this.even);
    const container = this.shadowRoot?.querySelector("div");
    if (container) {
      container.textContent = this.count;
    }
  }

  get count() {
    console.log("get count");
    return this.getAttribute("count");
  }

  set count(v) {
    console.log("set count");
    if (v) {
      this.setAttribute("count", v);
    } else {
      this.removeAttribute("count");
    }
  }

  get even() {
    return this.#internals.states.has("even");
  }

  set even(flag) {
    flag
      ? this.#internals.states.add("even")
      : this.#internals.states.delete("even");
  }

  increment = () => {
    console.log("increment");
    this.count = `${Number(this.count) + 1}`;
  };
}

if (window && !customElements.get("my-counter")) {
  customElements.define("my-counter", MyCounter);
}
