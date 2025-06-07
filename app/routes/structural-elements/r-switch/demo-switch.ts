import { computed, HandlerRegistry, signal } from "@radish/runtime";

export class DemoSwitch extends HandlerRegistry {
  condition1 = signal(true);
  condition2 = signal(false);
  condition3 = signal(false);

  number = signal(0);
  isEvenLessThan10 = computed(() =>
    this.number.value % 2 === 0 && this.number.value <= 10
  );
  isEvenBiggerThan10 = computed(() =>
    this.number.value % 2 === 0 && this.number.value > 10
  );
  isOdd = computed(() => this.number.value % 2 === 1);
}

if (window && !customElements.get("demo-switch")) {
  customElements.define("demo-switch", DemoSwitch);
}
