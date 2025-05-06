import { signal } from "@preact/signals-core";
import { HandlerRegistry } from "@radish/runtime";

export class HandleInput extends HandlerRegistry {
  override id = "123";
  content = signal("hi");
}
