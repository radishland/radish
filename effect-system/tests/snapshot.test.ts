import { assert, assertInstanceOf, unreachable } from "@std/assert";
import { delay } from "@std/async";
import { describe, test } from "@std/testing/bdd";
import { MissingHandlerScopeError } from "../errors.ts";
import { Snapshot } from "../handlers.ts";
import { HandlerScope } from "../mod.ts";
import { handleRandom, random } from "./setup.ts";

describe("effects snapshots", () => {
  test("setTimeout executes after HandlerScope is disposed of", async () => {
    {
      using _ = new HandlerScope(handleRandom);

      setTimeout(async () => {
        // handlers are lost
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

  test("Snapshot restores the HandlerScope in setTimeout", async () => {
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
});
