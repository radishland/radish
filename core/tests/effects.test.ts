import { assertEquals } from "@std/assert/equals";
import { assertGreaterOrEqual } from "@std/assert/greater-or-equal";
import { assertLessOrEqual } from "@std/assert/less-or-equal";
import { createEffect, handlerFor, runWith } from "../src/effects/mon.ts";

/**
 * Effect definitions
 */

interface IO {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, data: string) => Promise<void>;
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
    handlers: {
      ...handlerFor(get, () => state),
      ...handlerFor(set, (newState) => (state = newState)),
      ...handlerFor(update, (updater) => {
        state = updater(state);
      }),
    },
  };
};

/**
 * Handlers
 */

const ioHandlers = {
  ...handlerFor(io.readFile, async (path: string) => {
    await Console.log(`Reading from ${path}`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate I/O
    return `Content of ${path}`;
  }),
  ...handlerFor(io.writeFile, async (path: string, content: string) => {
    await Console.log(`Writing to ${path}: ${content}`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate I/O
  }),
};

const logs: string[] = [];

const consoleHandlers = handlerFor(
  Console.log,
  (message: string) => logs.push(message),
);

const randomHandlers = handlerFor(random, () => Math.random());

/**
 * Program
 */

const counter = createState(0);

async function exampleProgram() {
  const content = await io.readFile("example.txt");
  const value = await random();
  await counter.set(3);
  await counter.update((n) => 2 * n);
  const count = await counter.get();

  await io.writeFile("output.txt", content);

  await runWith(
    async () => {
      await Console.log(`${count}`);
    },
    {
      // Local override of the console effect
      handlers: handlerFor(
        Console.log,
        (message) => logs.push(`[log]: ${message}`),
      ),
    },
  );

  return { content, value, count };
}

const result = await runWith(
  exampleProgram,
  {
    handlers: {
      ...consoleHandlers,
      ...ioHandlers,
      ...randomHandlers,
      ...counter.handlers,
    },
  },
);

/**
 * Tests
 */

Deno.test("effect system", () => {
  assertEquals(result.content, "Content of example.txt");
  assertGreaterOrEqual(result.value, 0);
  assertLessOrEqual(result.value, 1);
  assertEquals(result.count, 6);
  assertEquals(logs, [
    "Reading from example.txt",
    "Writing to output.txt: Content of example.txt",
    "[log]: 6",
  ]);
});
