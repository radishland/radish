import { describe, test } from "@std/testing/bdd";
import { delay } from "@std/async";
import { HandlerScope } from "../mod.ts";
import { handleRandom, random } from "./setup.ts";
import {
  assert,
  assertEquals,
  assertInstanceOf,
  unreachable,
} from "@std/assert";
import { Snapshot } from "../handlers.ts";
import { MissingHandlerScopeError } from "../errors.Ts";

describe("effects async", () => {
  test("setTimeout executes after HandlerScopes are disposed of", async () => {
    {
      using _ = new HandlerScope(handleRandom);

      setTimeout(async () => {
        try {
          await random();
          unreachable();
        } catch (error) {
          assertInstanceOf(error, MissingHandlerScopeError);
        }
      }, 10);
    }

    await delay(20);
  });

  test("snapshot restores the scope inside setTimeout", async () => {
    {
      using _ = new HandlerScope(handleRandom);
      const snapshot = Snapshot();

      setTimeout(async () => {
        using _ = snapshot();

        const num = await random();
        assert(typeof num === "number");
      }, 10);
    }

    await delay(20);
  });

  test.ignore("single thread trying to do async doesn't work", async () => {
    {
      using _ = new HandlerScope(handleRandom);

      let curr;
      const double = async (x: number) => {
        curr = x;
        await delay(0);
        return curr * 2;
      };

      const res = await Promise.all([1, 2, 3].map(double));

      assertEquals(res, [2, 4, 6]);
    }

    await delay(1000);
  });
});
