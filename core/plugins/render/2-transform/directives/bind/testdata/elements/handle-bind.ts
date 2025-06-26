import { signal } from "@preact/signals-core";
import { HandlerRegistry } from "@radish/runtime";

export class HandleBind extends HandlerRegistry {
  condition1 = signal(true);
  condition2 = signal(false);
  condition3 = signal(false);

  content = "hi";

  load = signal(false);
  ellipsoid = false;
}
