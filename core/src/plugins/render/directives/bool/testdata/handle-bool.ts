import { signal } from "@preact/signals-core";
import { HandlerRegistry } from "@radish/runtime";

export class HandleBool extends HandlerRegistry {
  loading = signal(true);
  ellipsoid = signal(false);
  circle = true;
}
