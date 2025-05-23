import { computed, HandlerRegistry, signal } from "@radish/runtime";

export class HandleHtml extends HandlerRegistry {
  bool = signal(true);
  text = computed(() => this.bool.value ? "Hi" : "Bye");
}
