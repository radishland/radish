import { signal } from "@preact/signals-core";
import { HandlerRegistry } from "@radish/runtime";

export class HandleBind extends HandlerRegistry {
  checked = signal(true);
  content = "hi";

  load = signal(false);
  ellipsoid = false;
}
