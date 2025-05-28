import { describe, test } from "@std/testing/bdd";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { HandlerScope } from "../effect-system/mod.ts";
import { dispose, onDispose } from "./cleanup.ts";

describe("cleanup", () => {
  test("dispose runs onDispose callbacks", async () => {
    const scope = new HandlerScope();
    const disposeScope = async () => await scope[Symbol.asyncDispose]();
    const disposeScopeSpy = spy(disposeScope);

    onDispose(disposeScopeSpy);
    await dispose();

    assertSpyCalls(disposeScopeSpy, 1);
  });
});
