import { HandlerRegistry } from "@radish/runtime";

export class MyArticle extends HandlerRegistry {
  constructor() {
    super();
  }

  hi = () => {
    console.log("hi");
  };
}

if (window && !customElements.get("my-article")) {
  customElements.define("my-article", MyArticle);
}
