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

  test("snapshots keep track of mutations", async () => {
    {
      using _ = new HandlerScope();

      const state = createState("user", { name: "bob" });
      const snapshot = Snapshot();

      // turns out the user was updated after the snapshot was taken
      await state.set({ name: "bobby" });

      setTimeout(async () => {
        using _ = snapshot();
        const user = await state.get();
        assertExists(user);

        // the snapshot reflects the updated data
        assertEquals(user, { name: "bobby" });
      }, 10);
    }

    await delay(20);
  });
});

describe("async context loss patterns", () => {
  test("race condition map(double)", async () => {
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

  test("race condition map(double) fixed by createState", async () => {
    using _ = new HandlerScope();

    const double = async (x: number) => {
      const state = createState("requestId", x);
      await delay(1);
      await state.update((x) => x * 2);
      const curr = await state.get();
      assertExists(curr);
      return curr;
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

  test("setTimeout context loss fixed with createState", async () => {
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

  test("Promise.then context loss", () => {
    setContext({ id: 4 });
    Promise.resolve().then(() => {
      assertEquals(getContext(), { id: 5 }); // wants 4
    });

    setContext({ id: 5 });
    Promise.resolve().then(() => {
      assertEquals(getContext(), { id: 5 });
    });
  });

  test("Promise.then context loss fixed by createState", () => {
    using _ = new HandlerScope();
    const state = createState("user", { id: 4 });
    const snapshot = Snapshot();

    Promise.resolve().then(() => {
      using _ = snapshot();
      state.get().then((u) => {
        assertExists(u);
        assertEquals(u, { id: 4 });
      });
    });

    const state2 = createState("user", { id: 5 });
    const snapshot2 = Snapshot();
    Promise.resolve().then(() => {
      using _ = snapshot2();
      state2.get().then((u) => {
        assertExists(u);
        assertEquals(u, { id: 5 });
      });
    });
  });

  test("await context loss", () => {
    const flow = async (id: number, expected: number) => {
      setContext({ id });
      await 1;
      assertEquals(getContext(), { id: expected });
    };

    flow(3, 4); // would expect 3
    flow(4, 4);
  });

  test("await context loss fixed by createState", () => {
    const flow = async (id: number, expected: number) => {
      using _ = new HandlerScope();
      const state = createState("user", { id });
      await 1;
      const current = await state.get();
      assertEquals(current, { id: expected });
    };

    flow(3, 3);
    flow(4, 4);
  });

  test("queueMicrotask context loss", () => {
    const flow = (id: number, expected: number) => {
      setContext({ id });
      queueMicrotask(() => {
        assertEquals(getContext(), { id: expected });
      });
    };

    flow(3, 4); // would expect 3
    flow(4, 4);
  });

  test("queueMicrotask context loss fixed by createState", () => {
    const flow = (id: number, expected: number) => {
      using _ = new HandlerScope();
      const state = createState("user", { id });
      const snapshot = Snapshot();

      queueMicrotask(async () => {
        using _ = snapshot();
        const current = await state.get();
        assertEquals(current, { id: expected });
      });
    };

    flow(3, 3);
    flow(4, 4);
  });
});
