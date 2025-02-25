import { assertEquals } from "@std/assert/equals";
import {
  $array,
  $computed,
  $object,
  $state,
  type ReactiveValue,
} from "../src/client/reactivity.js";

const inc = (signal: ReactiveValue<number>) => {
  signal.value++;
};

Deno.test("reactive value", () => {
  const num = $state(2);
  const double = $computed(() => num.value * 2);
  assertEquals(num.value, 2);
  assertEquals(double.value, 4);

  inc(num);
  assertEquals(num.value, 3);
  assertEquals(double.value, 6);

  num.value++;
  assertEquals(num.value, 4);
  assertEquals(double.value, 8);

  num.value *= 2;
  assertEquals(num.value, 8);
  assertEquals(double.value, 16);

  num.value += 1;
  assertEquals(num.value, 9);
  assertEquals(double.value, 18);
});

Deno.test("reactive object", () => {
  const obj = $object({ a: "a" });
  const a = $computed(() => obj.a);
  assertEquals(a.value, "a");

  obj.a = "b";
  assertEquals(a.value, "b");
});

Deno.test("deep reactive objects", () => {
  const obj = $object({ deeply: { nested: { value: 1 } } }, { deep: true });
  const count = $computed(() => obj.deeply.nested.value * 2);
  assertEquals(count.value, 2);

  obj.deeply.nested.value = 2;
  assertEquals(count.value, 4);
});

Deno.test("reactive array", () => {
  const arr = $array(["a"]);
  const first = $computed(() => arr[0]);
  assertEquals(first.value, "a");

  arr[0] = "b";
  assertEquals(first.value, "b");
});

Deno.test("deep reactive arrays", () => {
  // array of 2x2 matrices
  const matrices = $array([[[0, 1], [2, 3]]], { deep: true });
  const first = $computed(() => matrices[0][0][0]);
  assertEquals(first.value, 0);

  matrices[0][0][0] = 1;
  assertEquals(first.value, 1);

  matrices[0][0] = [2, 4];
  assertEquals(first.value, 2);

  matrices[0] = [[3, 4], [5, 6]];
  assertEquals(first.value, 3);
});
