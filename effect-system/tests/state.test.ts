import { beforeEach, describe, test } from "@std/testing/bdd";
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
import { Snapshot } from "../handlers.ts";

let currentContext: Record<string, any> | null = null;

function setContext(ctx: Record<string, any>) {
  currentContext = ctx;
}

function getContext() {
  return currentContext;
}

beforeEach(() => {
  currentContext = null;
});

describe("effect async state", () => {
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

  test("map(double) works with createState", async () => {
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

  test("setTimeout context loss", async () => {
    // Can't reliably schedule contextual operations
    {
      setContext({ id: "A" });
      setTimeout(() => {
        assertEquals(getContext(), { id: "B" }); // expected: { id: 'A' }
      }, 10);
    }

    {
      setContext({ id: "B" });
      setTimeout(() => {
        assertEquals(getContext(), { id: "B" });
      }, 20);
    }

    await delay(40);
  });

  test("snapshot states keep track of their context", async () => {
    using _ = new HandlerScope();

    {
      const state = createState("user", { id: "A" });
      const snapshot = Snapshot();

      setTimeout(async () => {
        using _ = snapshot();
        const user = await state.get();
        assertExists(user);
        assertEquals(user, { id: "A" }); // as expected
      }, 10);
    }

    {
      const state2 = createState("user", { id: "B" });
      const snapshot2 = Snapshot();

      setTimeout(async () => {
        using _ = snapshot2();
        const user = await state2.get();
        assertExists(user);
        assertEquals(user, { id: "B" });
      }, 20);
    }

    await delay(40);
  });
});
