export class MyArticle extends HTMLElement {}

if (window && !customElements.get("my-article")) {
  customElements.define("my-article", MyArticle);
}
