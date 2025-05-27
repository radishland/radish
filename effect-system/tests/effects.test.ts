import {
  assertEquals,
  assertGreaterOrEqual,
  assertInstanceOf,
  assertLessOrEqual,
  unreachable,
} from "@std/assert";
import { afterEach, beforeEach, describe, test } from "@std/testing/bdd";
import { Effect, handlerFor } from "../effects.ts";
import {
  IllFormedEffectError,
  MissingHandlerScopeError,
  MissingTerminalHandlerError,
  UnhandledEffectError,
} from "../errors.ts";
import { addHandlers, Handler, handlerScopes } from "../handlers.ts";
import { HandlerScope, id } from "../mod.ts";
import {
  Console,
  createState,
  handleConsole,
  handleIOReadBase,
  handleIoReadTXT,
  handleRandom,
  handlerServerStart,
  io,
  logs,
  random,
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
      await random();
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
      using scope = new HandlerScope(handleRandom);
      scope.onDispose(() => {
        logs.push("clean");
      });
    }

    assertEquals(logs, ["clean"]);
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
      using scope = new HandlerScope(handleRandom);

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
    using _ = new HandlerScope(handleRandom);

    const number = await random();

    assertEquals(typeof number, "number");
    assertGreaterOrEqual(number, 0);
    assertLessOrEqual(number, 1);
  });

  test("plugin", async () => {
    using _ = new HandlerScope({
      name: "plugin-io",
      handlers: [handleIoReadTXT, handleIOReadBase],
    });

    const txt = await io.readFile("note.txt");
    assertEquals(txt, "txt content");

    const ts = await io.readFile("script.ts");
    assertEquals(ts, "file content");
  });

  test("delegation", async () => {
    using _ = new HandlerScope(handleIoReadTXT, handleIOReadBase);

    const txt = await io.readFile("note.txt");
    const css = await io.readFile("style.css");

    assertEquals(txt, "txt content");
    assertEquals(css, "file content");
  });

  test("missing terminal handler", async () => {
    using _ = new HandlerScope(handleIoReadTXT);

    try {
      await io.readFile("style.css");
      unreachable();
    } catch (error) {
      assertInstanceOf(error, MissingTerminalHandlerError);
    }
  });

  test("dynamic handling", async () => {
    using _ = new HandlerScope();
    addHandlers(handleIoReadTXT);

    const txt = await io.readFile("note.txt");
    assertEquals(txt, "txt content");
  });

  test("dynamic delegation", async () => {
    using _ = new HandlerScope(handleIOReadBase);
    addHandlers(handleIoReadTXT);

    const txt = await io.readFile("note.txt");
    assertEquals(txt, "txt content");

    const ts = await io.readFile("script.ts");
    assertEquals(ts, "file content");
  });

  test("unscoped dynamic handling", () => {
    try {
      addHandlers(handleIoReadTXT);
      unreachable();
    } catch (error) {
      assertInstanceOf(error, MissingHandlerScopeError);
    }
  });

  test("simple scoping", async () => {
    {
      using _ = new HandlerScope(handleIOReadBase);

      const txt = await io.readFile("note.txt");
      assertEquals(txt, "file content");
    }

    try {
      await io.readFile("note.txt");
      unreachable();
    } catch (error) {
      assertInstanceOf(error, MissingHandlerScopeError);
    }
  });

  test("handlers can be in a parent scope", async () => {
    using _ = new HandlerScope(handleIOReadBase);

    {
      using __ = new HandlerScope(handleRandom);

      const content = await io.readFile("file");
      assertEquals(content, "file content");
    }
  });

  test("handlers can delegate to a parent scope handler", async () => {
    using _ = new HandlerScope(handleIOReadBase);
    using __ = new HandlerScope(handleIoReadTXT);

    const content = await io.readFile("file.ts");
    assertEquals(content, "file content");
  });

  test("effects can perform other effects", async () => {
    const readAndLog = handlerFor(io.readFile, async (path: string) => {
      await Console.log(`reading ${path}...`);
      return `content of ${path}`;
    });

    using _ = new HandlerScope(readAndLog, handleConsole);

    const res = await io.readFile("/path/to/file");
    assertEquals(logs, ["reading /path/to/file..."]);
    assertEquals(res, "content of /path/to/file");
  });

  test("handler decoration", async () => {
    // `transformTXT` only modifies the payload without doing the handling
    // io.transformFile is handled trivially
    const transformTXT = handlerFor(io.transformFile, ({ path, data }) => {
      if (path.endsWith(".txt")) {
        return Handler.continue({ path, data: data.toUpperCase() });
      }
      return Handler.continue({ path, data });
    });

    using _ = new HandlerScope(transformTXT.flatMap(id));

    const { data } = await io.transformFile({
      path: "note.txt",
      data: "some todos",
    });

    assertEquals(data, "SOME TODOS");
  });

  test("observation", async () => {
    const state = createState(0);

    // the countWrite handler only observe the io/write effect and does something orthogonal
    const countWrites = handlerFor(io.writeFile, async (path, data) => {
      await state.update((old) => old + 1);
      return Handler.continue(path, data);
    });

    const handleWrite = handlerFor(io.writeFile, async (path, data) => {
      await Console.log(`writing to "${path}": "${data}"`);
    });

    using _ = new HandlerScope(
      countWrites,
      handleWrite,
      ...state.handlers,
      handleConsole,
    );

    await io.writeFile("todo.txt", "garden");
    await io.writeFile("styles.css", "some styles");
    await io.writeFile("script.ts", "my script");

    assertEquals(logs, [
      'writing to "todo.txt": "garden"',
      'writing to "styles.css": "some styles"',
      'writing to "script.ts": "my script"',
    ]);
    assertEquals(await state.get(), 3);
  });
});
