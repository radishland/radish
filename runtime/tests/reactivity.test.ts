import { assertEquals } from "@std/assert/equals";
import { array, computed, object, signal } from "../src/reactivity.ts";

Deno.test("reactive object", () => {
  const obj = object({ a: "a" });

  let calls = 0;
  const a = computed(() => {
    calls++;
    return obj.a;
  });

  assertEquals(calls, 0);
  assertEquals(a.value, "a");
  assertEquals(calls, 1);

  obj.a = "b";

  assertEquals(calls, 1);
  assertEquals(a.value, "b");
  assertEquals(calls, 2);
});

Deno.test("deep reactive objects", () => {
  const obj = object({ deeply: { nested: { value: 1 } } });

  let calls = 0;
  const val = computed(() => {
    calls++;
    return obj.deeply.nested.value * 2;
  });

  assertEquals(calls, 0);
  assertEquals(val.value, 2);
  assertEquals(calls, 1);

  obj.deeply.nested.value = 2;

  assertEquals(calls, 1);
  assertEquals(val.value, 4);
  assertEquals(calls, 2);
});

Deno.test("reactive array", () => {
  const arr = array(["a"]);
  const first = computed(() => arr[0]);

  assertEquals(first.value, "a");

  arr[0] = "b";
  assertEquals(first.value, "b");
});

// Deno.test("deep reactive arrays", () => {
//   // array of 2x2 matrices
//   const matrices = $array([[[0, 1], [2, 3]]], { deep: true });
//   const first = $computed(() => matrices[0][0][0]);
//   assertEquals(first.value, 0);

//   matrices[0][0][0] = 1;
//   assertEquals(first.value, 1);

//   matrices[0][0] = [2, 4];
//   assertEquals(first.value, 2);

//   matrices[0] = [[3, 4], [5, 6]];
//   assertEquals(first.value, 3);
// });
