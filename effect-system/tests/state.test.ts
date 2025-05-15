import { describe, test } from "@std/testing/bdd";
import { HandlerScope } from "../mod.ts";
import { createState } from "../state.ts";
import {
  assertEquals,
  assertExists,
  assertInstanceOf,
  assertNotEquals,
  unreachable,
} from "@std/assert";
import { MissingHandlerScopeError } from "../errors.ts";
import { delay } from "@std/async";

describe("effect asyncState", () => {
  test("needs a HandlerScope", () => {
    try {
      createState("requestId", 0);
      unreachable();
    } catch (error) {
      assertInstanceOf(error, MissingHandlerScopeError);
    }
  });

  test("get, set, update", async () => {
    using _ = new HandlerScope();
    const state = createState("requestId", 0);

    let value = await state.get();
    assertEquals(value, 0);

    await state.set(1);
    value = await state.get();
    assertEquals(value, 1);

    await state.update((x) => x * 2);
    value = await state.get();
    assertEquals(value, 2);
  });

  test("map(double) suffers async context loss", async () => {
    let curr;

    const double = async (x: number) => {
      curr = x;
      await delay(1);
      return curr * 2;
    };

    const res = await Promise.all([1, 2, 3].map(double));

    assertNotEquals(res, [2, 4, 6]);
    assertEquals(res, [6, 6, 6]);
  });

  test.only("map(double) works with createState", async () => {
    using _ = new HandlerScope();

    const double = async (x: number) => {
      const state = createState("requestId", x);
      await delay(1);

      const curr = await state.get();
      assertExists(curr);
      return curr * 2;
    };

    const res = await Promise.all([1, 2, 3].map(double));

    assertEquals(res, [2, 4, 6]);
  });
});
