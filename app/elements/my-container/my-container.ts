export class MyContainer extends HTMLElement {}

if (window && !customElements.get("my-container")) {
  customElements.define("my-container", MyContainer);
}
