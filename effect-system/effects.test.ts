import { afterEach, beforeEach, describe, test } from "@std/testing/bdd";
import { assertEquals } from "@std/assert/equals";
import { assertGreaterOrEqual } from "@std/assert/greater-or-equal";
import { assertLessOrEqual } from "@std/assert/less-or-equal";
import { createEffect, handlerFor } from "./effects.ts";
import { addHandlers, Handler, handlerScopes, runWith } from "./handlers.ts";
import { assertInstanceOf, unreachable } from "@std/assert";
import { id } from "./mod.ts";

/**
 * Console
 */

interface ConsoleOps {
  log: (message: string) => void;
}

const Console = { log: createEffect<ConsoleOps["log"]>("console/log") };

const logs: string[] = [];

const handleConsole = handlerFor(Console.log, (message: string) => {
  logs.push(message);
});

/**
 * State
 */

interface StateOps<S> {
  get: () => S;
  set: (state: S) => void;
  update: (updater: (old: S) => S) => void;
}

const createState = <S>(initialState: S) => {
  const get = createEffect<StateOps<S>["get"]>("state/get");
  const set = createEffect<StateOps<S>["set"]>("state/set");
  const update = createEffect<StateOps<S>["update"]>("state/update");

  let state = initialState;

  return {
    get,
    set,
    update,
    handlers: [
      handlerFor(get, () => state),
      handlerFor(set, (newState) => {
        state = newState;
      }),
      handlerFor(update, (updater) => {
        state = updater(state);
      }),
    ],
  };
};

const state = createState(0);

/**
 * Random
 */

interface RandomOps {
  random: () => number;
}

const random = createEffect<RandomOps["random"]>("random");

const handleRandom = handlerFor(random, () => Math.random());

/**
 * IO
 */

interface IO {
  readFile: (path: string) => string;
  writeFile: (path: string, data: string) => void;
  transformFile: (
    options: { path: string; data: string },
  ) => { path: string; data: string };
}

const io = {
  readFile: createEffect<IO["readFile"]>("io/read"),
  writeFile: createEffect<IO["writeFile"]>("io/write"),
  transformFile: createEffect<
    (options: { path: string; data: string }) => { path: string; data: string }
  >("io/transform"),
};

const handleIoReadTXT = handlerFor(io.readFile, (path: string) => {
  if (path.endsWith(".txt")) {
    return "txt content";
  }
  return Handler.continue(path);
});

const handleIOReadBase = handlerFor(io.readFile, () => {
  return "file content";
});

/**
 * Tests
 */

beforeEach(() => {
  assertEquals(handlerScopes.length, 0, "the scope wasn't flushed");
});

afterEach(() => {
  assertEquals(handlerScopes.length, 0, "the scope wasn't flushed");
  logs.length = 0;
});

describe("effect system", () => {
  test("unhandled effect", async () => {
    await runWith(
      async () => {
        try {
          await random();
          unreachable();
        } catch (error) {
          assertInstanceOf(error, Error);
          assertEquals(error.message, 'Unhandled effect "random"');
        }
      },
      [],
    );
  });

  test("simple handling", async () => {
    await runWith(
      async () => {
        const number = await random();

        assertEquals(typeof number, "number");
        assertGreaterOrEqual(number, 0);
        assertLessOrEqual(number, 1);
      },
      [handleRandom],
    );
  });

  test("delegation", async () => {
    await runWith(async () => {
      const txt = await io.readFile("note.txt");
      const css = await io.readFile("style.css");

      assertEquals(txt, "txt content");
      assertEquals(css, "file content");
    }, [handleIoReadTXT, handleIOReadBase]);
  });

  test("missing terminal handler", async () => {
    await runWith(async () => {
      try {
        await io.readFile("style.css");
        unreachable();
      } catch (error) {
        assertInstanceOf(error, Error);
        assertEquals(
          error.message,
          'Handling effect "io/read" returned `Continue`. Make sure the handlers sequence contains a terminal handler',
        );
      }
    }, [handleIoReadTXT]);
  });

  test("dynamic handling", async () => {
    await runWith(async () => {
      addHandlers([handleIoReadTXT]);

      const txt = await io.readFile("note.txt");
      assertEquals(txt, "txt content");
    }, []);
  });

  test("dynamic delegation", async () => {
    await runWith(async () => {
      addHandlers([handleIoReadTXT]);

      const txt = await io.readFile("note.txt");
      assertEquals(txt, "txt content");

      const ts = await io.readFile("script.ts");
      assertEquals(ts, "file content");
    }, [handleIOReadBase]);
  });

  test("unscoped dynamic handling", () => {
    try {
      addHandlers([handleIoReadTXT]);
      unreachable();
    } catch (error) {
      assertInstanceOf(error, Error);
      assertEquals(
        error.message,
        '"addHandlers" called outside of an effect scope',
      );
    }
  });

  test("handlers can be in a parent scope", async () => {
    await runWith(async () => {
      await runWith(async () => {
        const content = await io.readFile("file");
        assertEquals(content, "file content");
      }, [handleRandom]);
    }, [handleIOReadBase]);
  });

  test("handlers can delegate to a parent scope handler", async () => {
    await runWith(async () => {
      await runWith(async () => {
        const content = await io.readFile("file.ts");
        assertEquals(content, "file content");
      }, [handleIoReadTXT]);
    }, [handleIOReadBase]);
  });

  test("effects can perform other effects", async () => {
    const readAndLog = handlerFor(io.readFile, async (path: string) => {
      await Console.log(`reading ${path}...`);
      return `content of ${path}`;
    });

    await runWith(async () => {
      const res = await io.readFile("/path/to/file");
      assertEquals(logs, ["reading /path/to/file..."]);
      assertEquals(res, "content of /path/to/file");
    }, [readAndLog, handleConsole]);
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

    await runWith(async () => {
      const { data } = await io.transformFile({
        path: "note.txt",
        data: "some todos",
      });

      assertEquals(data, "SOME TODOS");
    }, [transformTXT.flatMap(id)]);
  });

  test("observation", async () => {
    // the countWrite handler only observe the io/write effect and does something orthogonal
    const countWrites = handlerFor(io.writeFile, async (path, data) => {
      await state.update((old) => old + 1);
      return Handler.continue(path, data);
    });

    const handleWrite = handlerFor(io.writeFile, async (path, data) => {
      await Console.log(`writing to "${path}": "${data}"`);
    });

    await runWith(async () => {
      await io.writeFile("todo.txt", "garden");
      await io.writeFile("styles.css", "some styles");
      await io.writeFile("script.ts", "my script");

      assertEquals(logs, [
        'writing to "todo.txt": "garden"',
        'writing to "styles.css": "some styles"',
        'writing to "script.ts": "my script"',
      ]);
      assertEquals(await state.get(), 3);
    }, [countWrites, handleWrite, ...state.handlers, handleConsole]);
  });
});
