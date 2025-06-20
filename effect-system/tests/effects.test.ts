import {
  assertEquals,
  assertGreaterOrEqual,
  assertInstanceOf,
  assertLessOrEqual,
  unreachable,
} from "@std/assert";
import { afterEach, beforeEach, describe, test } from "@std/testing/bdd";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { Effect, handlerFor } from "../effects.ts";
import {
  IllFormedEffectError,
  MissingHandlerScopeError,
  MissingTerminalHandlerError,
  UnhandledEffectError,
} from "../errors.ts";
import { Handler, handlerScopes } from "../handlers.ts";
import { addHandler, HandlerScope, id } from "../mod.ts";
import {
  Console,
  createState,
  fs,
  handleConsole,
  handleFSReadBase,
  handleIoReadTXT,
  handleNumberRandom,
  handleNumberTransform,
  handlerServerStart,
  handleTransformUpper,
  logs,
  number,
  serverStart,
} from "./setup.test.ts";

/**
 * Tests
 */

beforeEach(() => {
  assertEquals(handlerScopes.length, 0, "the scope wasn't flushed");
});

afterEach(() => {
  assertEquals(handlerScopes.length, 0, "the scope wasn't flushed");
  assertEquals(logs.length, 0, "the logs weren't flushed");
});

describe("effect system", () => {
  test("unhandled effect", async () => {
    using _ = new HandlerScope();

    try {
      await number.random();
      unreachable();
    } catch (error) {
      assertInstanceOf(error, UnhandledEffectError);
    }
  });

  test("ill-formed effect", () => {
    try {
      handlerFor(() => new Effect(() => Promise.resolve(1)), () => 1);
      unreachable();
    } catch (error) {
      assertInstanceOf(error, IllFormedEffectError);
    }
  });

  test("scope cleanup", () => {
    const logs: string[] = [];

    {
      using scope = new HandlerScope(handleNumberRandom);
      scope.onDispose(() => {
        logs.push("clean");
      });
    }

    assertEquals(logs, ["clean"]);
  });

  test("HandlerScope Symbol.dispose is lexically bound", () => {
    const resources = new DisposableStack();
    const scope = new HandlerScope();

    const disposeSpy = spy(scope[Symbol.dispose]);
    resources.defer(disposeSpy);
    resources.dispose();

    assertSpyCalls(disposeSpy, 1);
  });

  test("HandlerScope Symbol.asyncDispose function is lexically bound", async () => {
    const resources = new AsyncDisposableStack();
    const scope = new HandlerScope();

    const asyncDisposeSpy = spy(scope[Symbol.asyncDispose]);
    resources.defer(asyncDisposeSpy);
    await resources.disposeAsync();

    assertSpyCalls(asyncDisposeSpy, 1);
  });

  test("handler cleanup", async () => {
    assertEquals(logs.length, 0);
    {
      using _ = new HandlerScope(handleConsole);
      await Console.log("first");
    }
    assertEquals(logs.length, 0);

    {
      using _ = new HandlerScope(handleConsole);
      await Console.log("second");
    }
    assertEquals(logs.length, 0);
  });

  test("handler async cleanup", async () => {
    using _ = new HandlerScope(handleConsole);

    {
      assertEquals(logs, []);
      await using _ = new HandlerScope(handlerServerStart);
      await serverStart();
      assertEquals(logs, ["Starting server..."]);
    }

    assertEquals(logs, [
      "Starting server...",
      "Closing server...",
      "Server closed",
    ]);
  });

  test("scope cleanup is idempotent", () => {
    const logs: string[] = [];

    {
      using scope = new HandlerScope(handleNumberRandom);

      scope.onDispose(() => {
        logs.push("clean");
      });

      scope[Symbol.dispose]();
      scope[Symbol.dispose]();
      scope[Symbol.dispose]();
    }

    assertEquals(logs, ["clean"]);
  });

  test("simple handling", async () => {
    using _ = new HandlerScope(handleNumberRandom);

    const random = await number.random();

    assertEquals(typeof random, "number");
    assertGreaterOrEqual(random, 0);
    assertLessOrEqual(random, 1);
  });

  test("plugin", async () => {
    const pluginFS = {
      name: "plugin-fs",
      handlers: [handleIoReadTXT, handleFSReadBase],
    };

    using _ = new HandlerScope(pluginFS);

    const txt = await fs.read("note.txt");
    assertEquals(txt, "txt content");

    const ts = await fs.read("script.ts");
    assertEquals(ts, "file content");
  });

  test("delegation", async () => {
    using _ = new HandlerScope(handleIoReadTXT, handleFSReadBase);

    const txt = await fs.read("note.txt");
    const css = await fs.read("style.css");

    assertEquals(txt, "txt content");
    assertEquals(css, "file content");
  });

  test("missing terminal handler", async () => {
    using _ = new HandlerScope(handleIoReadTXT);

    try {
      await fs.read("style.css");
      unreachable();
    } catch (error) {
      assertInstanceOf(error, MissingTerminalHandlerError);
    }
  });

  test("dynamic handling", async () => {
    using _ = new HandlerScope();
    addHandler(handleIoReadTXT);

    const txt = await fs.read("note.txt");
    assertEquals(txt, "txt content");
  });

  test("dynamic delegation", async () => {
    using _ = new HandlerScope(handleFSReadBase);
    addHandler(handleIoReadTXT);

    const txt = await fs.read("note.txt");
    assertEquals(txt, "txt content");

    const ts = await fs.read("script.ts");
    assertEquals(ts, "file content");
  });

  test("unscoped dynamic handling", () => {
    try {
      addHandler(handleIoReadTXT);
      unreachable();
    } catch (error) {
      assertInstanceOf(error, MissingHandlerScopeError);
    }
  });

  test("simple scoping", async () => {
    {
      using _ = new HandlerScope(handleFSReadBase);

      const txt = await fs.read("note.txt");
      assertEquals(txt, "file content");
    }

    try {
      await fs.read("note.txt");
      unreachable();
    } catch (error) {
      assertInstanceOf(error, MissingHandlerScopeError);
    }
  });

  test("handlers can be in a parent scope", async () => {
    using _ = new HandlerScope(handleFSReadBase);

    {
      using __ = new HandlerScope(handleNumberRandom);

      const content = await fs.read("file");
      assertEquals(content, "file content");
    }
  });

  test("delegation to a parent scope handler", async () => {
    using _ = new HandlerScope(handleFSReadBase);
    using __ = new HandlerScope(handleIoReadTXT);

    const content = await fs.read("file.ts");
    assertEquals(content, "file content");
  });

  test("decoration", async () => {
    // `transformTXT` only modifies the payload without doing the handling
    // fs.transformFile is handled trivially
    const toUpperCase = handlerFor(fs.transform, (path, data) => {
      if (path.endsWith(".txt")) {
        data = data.toUpperCase();
      }
      return Handler.continue(path, data);
    });

    const prefix = handlerFor(fs.transform, (path, data) => {
      if (path.endsWith(".txt")) {
        data = "a" + data;
      }
      return Handler.continue(path, data);
    });

    const suffix = handlerFor(fs.transform, (path, data) => {
      if (path.endsWith(".txt")) {
        data = data + "b";
      }
      return Handler.continue(path, data);
    });

    using _ = new HandlerScope(
      toUpperCase,
      prefix,
      suffix.flatMap((_, d) => d),
    );

    const data = await fs.transform("note.txt", "some todos");

    assertEquals(data, "aSOME TODOSb");
  });

  test("observation", async () => {
    const state = createState(0);

    // the countWrite handler only observe the fs/write effect and does something orthogonal
    const countWrites = handlerFor(fs.write, async (path, data) => {
      await state.update((old) => old + 1);
      return Handler.continue(path, data);
    });

    const handleWrite = handlerFor(fs.write, async (path, data) => {
      await Console.log(`writing to "${path}": "${data}"`);
    });

    using _ = new HandlerScope(
      countWrites,
      handleWrite,
      ...state.handlers,
      handleConsole,
    );

    await fs.write("todo.txt", "garden");
    await fs.write("styles.css", "some styles");
    await fs.write("script.ts", "my script");

    assertEquals(logs, [
      'writing to "todo.txt": "garden"',
      'writing to "styles.css": "some styles"',
      'writing to "script.ts": "my script"',
    ]);
    assertEquals(await state.get(), 3);
  });

  test("effects can perform other effects", async () => {
    const readAndLog = handlerFor(fs.read, async (path: string) => {
      await Console.log(`reading ${path}...`);
      return `content of ${path}`;
    });

    // ... and `flatMap` returns early if the return is not `Continue`
    using _ = new HandlerScope(readAndLog.flatMap(id), handleConsole);

    const res = await fs.read("/path/to/file");
    assertEquals(logs, ["reading /path/to/file..."]);
    assertEquals(res, "content of /path/to/file");
  });

  test("recursive handlers", async () => {
    using _ = new HandlerScope(handleNumberTransform);

    const transformed = await number.transform("2113");
    assertEquals(transformed, "122113");
  });

  test("suspended handlers", async () => {
    const suspendedEffectA = handlerFor(fs.transform, async (path, content) => {
      const transformed = await fs.transform(path, content);
      return "a" + transformed + "a";
    }, { reentrant: false });

    const suspendedEffectB = handlerFor(fs.transform, async (path, content) => {
      const transformed = await fs.transform(path, content);
      return "b" + transformed + "b";
    }, { reentrant: false });

    using _ = new HandlerScope(
      suspendedEffectA,
      suspendedEffectB,
      handleTransformUpper,
    );

    const transformed = await fs.transform("/path", "content");
    assertEquals(transformed, "abCONTENTba");
  });

  test("one-shot handlers", async () => {
    const readSecret = handlerFor(fs.read, (path) => {
      if (path === "secret") {
        return "token";
      }
      return Handler.continue(path);
    }, { once: true });

    using _ = new HandlerScope(readSecret, handleFSReadBase);

    const content = await fs.read("/path");
    assertEquals(content, "file content");

    const token = await fs.read("secret");
    assertEquals(token, "token");

    const token2 = await fs.read("secret");
    assertEquals(token2, "file content");
  });

  test("one-shot suspended handlers", async () => {
    const surroundOnce = handlerFor(fs.transform, async (path, content) => {
      const transformed = await fs.transform(path, content);
      return "_" + transformed + "_";
    }, { reentrant: false, once: true });

    using _ = new HandlerScope(
      surroundOnce,
      handleTransformUpper,
    );

    const a = await fs.transform("/path", "content");
    assertEquals(a, "_CONTENT_");

    const b = await fs.transform("/path", "hello");
    assertEquals(b, "HELLO");
  });
});
