import { assertEquals } from "@std/assert";
import { computed, reactive } from "../src/reactivity.ts";

Deno.test("reactive object", () => {
  const obj = reactive({ a: "a" });

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
  const obj = reactive({ deeply: { nested: { value: 1 } } });

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
  const arr = reactive(["a"]);

  let calls = 0;
  const first = computed(() => {
    calls++;
    return arr[0];
  });

  assertEquals(calls, 0);
  assertEquals(arr[0], "a");
  assertEquals(first.value, "a");
  assertEquals(calls, 1);

  arr[0] = "b";

  assertEquals(calls, 1);
  assertEquals(arr[0], "b");
  assertEquals(first.value, "b");
  assertEquals(calls, 2);
});

Deno.test("deep reactive arrays", () => {
  const matrices = reactive([[[0, 1], [2, 3]]]) as [
    [[number, number], [number, number]],
  ];

  let calls = 0;
  const first = computed(() => {
    calls++;
    return matrices[0][0][0];
  });

  assertEquals(calls, 0);
  assertEquals(first.value, 0);
  assertEquals(calls, 1);

  matrices[0][0][0] = 1;

  assertEquals(calls, 1);
  assertEquals(first.value, 1);
  assertEquals(calls, 2);

  matrices[0][0] = [2, 4];

  assertEquals(calls, 2);
  assertEquals(first.value, 2);
  assertEquals(calls, 3);

  matrices[0] = [[3, 4], [5, 6]];

  assertEquals(calls, 3);
  assertEquals(first.value, 3);
  assertEquals(calls, 4);
});
