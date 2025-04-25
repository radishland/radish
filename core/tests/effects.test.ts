import { assertEquals } from "@std/assert/equals";
import { assertGreaterOrEqual } from "@std/assert/greater-or-equal";
import { assertLessOrEqual } from "@std/assert/less-or-equal";
import { createEffect, handlerFor, runWith } from "../src/effects/effects.ts";
import { id } from "../src/utils/algebraic-structures.ts";
import { Handler } from "../src/effects/handlers.ts";

/**
 * Effect definitions
 */

interface IO {
  readFile: (path: string) => string;
  writeFile: (path: string, data: string) => void;
  transformFile: (
    options: { path: string; data: string },
  ) => { path: string; data: string };
}

interface ConsoleOps {
  log: (message: string) => void;
}

interface RandomOps {
  random: () => number;
}

interface StateOps<S> {
  get: () => S;
  set: (state: S) => void;
  update: (updater: (old: S) => S) => void;
}

const io = {
  readFile: createEffect<IO["readFile"]>("io/read"),
  writeFile: createEffect<IO["writeFile"]>("io/write"),
  transformFile: createEffect<
    (options: { path: string; data: string }) => { path: string; data: string }
  >("io/transform"),
};

const Console = { log: createEffect<ConsoleOps["log"]>("console/log") };

const random = createEffect<RandomOps["random"]>("random");

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

/**
 * Handlers
 */

const ioHandlers = [
  handlerFor(io.readFile, async (path: string) => {
    if (path.endsWith(".txt")) {
      await Console.log(`TXT reader on ${path}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      return (`Content of ${path}`);
    }

    return Handler.continue(path);
  }),
  handlerFor(io.readFile, async (path: string) => {
    if (path.endsWith(".css")) {
      await Console.log(`CSS reader on ${path}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      return (`Content of ${path}`);
    }

    return Handler.continue(path);
  }),
  handlerFor(io.writeFile, async (path: string, content: string) => {
    await Console.log(`Writing to ${path}: ${content}`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate I/O
  }),
  handlerFor(io.transformFile, ({ path, data }) => {
    if (path.endsWith(".txt")) {
      return Handler.continue({ path, data: data.toUpperCase() });
    }
    return Handler.continue({ path, data });
  }),
  handlerFor(io.transformFile, ({ path, data }) => {
    if (path.endsWith(".txt")) {
      return Handler.continue({ path, data: data + "..." });
    }
    return Handler.continue({ path, data });
  }),
  handlerFor(io.transformFile, async ({ path, data }) => {
    if (path.endsWith(".css")) {
      await Console.log(`transforming file ${path}`);
      return Handler.continue({ path, data: data.toLowerCase() });
    }
    return Handler.continue({ path, data });
  }),
  handlerFor(io.transformFile, id),
];

const logs: string[] = [];

const consoleHandler = handlerFor(
  Console.log,
  (message: string) => {
    logs.push(message);
  },
);

const randomHandler = handlerFor(random, () => Math.random());

/**
 * Program
 */

const counter = createState(0);

async function exampleProgram() {
  const path = "example.txt";
  const content = await io.readFile(path);
  const { data: transformed } = await io.transformFile({ path, data: content });

  const value = await random();
  await counter.set(3);
  await counter.update((n) => 2 * n);
  const count = await counter.get();

  await io.writeFile("output.txt", content);

  const cssPath = "example.css";
  const css = await io.readFile(cssPath);
  const { data: transformedCSS } = await io.transformFile({
    path: cssPath,
    data: css,
  });
  await Console.log(transformedCSS);

  await runWith(
    async () => {
      await Console.log(`${count}`);
    },
    [
      // Local override of the console effect
      handlerFor(Console.log, (message) => {
        logs.push(`[log]: ${message}`);
      }),
    ],
  );

  return { content: transformed, value, count };
}

const result = await runWith(
  exampleProgram,
  [
    consoleHandler,
    randomHandler,
    ...ioHandlers,
    ...counter.handlers,
  ],
);

/**
 * Tests
 */

Deno.test("effect system", () => {
  assertEquals(result.content, "CONTENT OF EXAMPLE.TXT...");
  assertGreaterOrEqual(result.value, 0);
  assertLessOrEqual(result.value, 1);
  assertEquals(result.count, 6);
  assertEquals(logs, [
    "TXT reader on example.txt",
    "Writing to output.txt: Content of example.txt",
    "CSS reader on example.css",
    "transforming file example.css",
    "content of example.css",
    "[log]: 6",
  ]);
});
