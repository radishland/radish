import { assert, assertInstanceOf, unreachable } from "@std/assert";
import { delay } from "@std/async";
import { describe, test } from "@std/testing/bdd";
import { MissingHandlerScopeError } from "../errors.ts";
import { Snapshot } from "../handlers.ts";
import { HandlerScope } from "../mod.ts";
import { handleNumberRandom, number } from "./setup.test.ts";

describe("effects snapshots", () => {
  test("setTimeout executes after HandlerScope is disposed of", async () => {
    {
      using _ = new HandlerScope(handleNumberRandom);

      setTimeout(async () => {
        // handlers are lost
        try {
          await number.random();
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
      using _ = new HandlerScope(handleNumberRandom);
      const snapshot = Snapshot();

      setTimeout(async () => {
        using _ = snapshot();

        const num = await number.random();
        assert(typeof num === "number");
      }, 10);
    }

    await delay(20);
  });

  test.ignore("Handler.all runs effects in parallel", () => {
    // const content = ["a", "b", "c"];

    // const handleTransformSurround = handlerFor(
    //   fs.transform,
    //   async (path, data) => {
    //     const result = await fs.transform(path, data);
    //     return "_" + result + "_";
    //   },
    //   { suspend: true },
    // );

    {
      // ...but Promise.all is not reliable
      // using _ = new HandlerScope(handleTransformSurround, handleTransformUpper);

      // const promiseAllTransformed = await Promise.all(
      //   content.map((c) => fs.transform("path", c)),
      // );
      // assertEquals(promiseAllTransformed, ["_A_", "B", "C"]);
    }

    {
      // using _ = new HandlerScope(handleTransformSurround, handleTransformUpper);

      // const transformed = await Handler.all(
      //   content.map((c) => fs.transform("path", c)),
      // );
      // assertEquals(transformed, ["_A_", "_B_", "_C_"]);
    }
  });
});
