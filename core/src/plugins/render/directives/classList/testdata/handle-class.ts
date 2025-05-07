import { signal } from "@preact/signals-core";
import { HandlerRegistry } from "@radish/runtime";

export class HandleClass extends HandlerRegistry {
  state = signal({
    "topping": true,
    "beverage": false,
  });
}
