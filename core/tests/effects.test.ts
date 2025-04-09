import { assertEquals } from "@std/assert/equals";
import {
  createEffect,
  createHandlers,
  type EffectDefinition,
  type EffectHandlers,
  runWith,
} from "../src/effects/effects.ts";
import { assertLessOrEqual } from "@std/assert/less-or-equal";
import { assertGreaterOrEqual } from "@std/assert/greater-or-equal";

interface FileSystemOps {
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

const io = createEffect<FileSystemOps>("io");
const Console = createEffect<ConsoleOps>("console");
const random = createEffect<RandomOps>("random");

const createState = <S>(initialState: S) => {
  const stateEffect = createEffect<StateOps<S>>("state");
  let state = initialState;

  return [
    stateEffect,
    createHandlers(stateEffect, {
      get: () => state,
      set: (newState) => (state = newState),
      update: (updater) => {
        state = updater(state);
      },
    }),
  ] as [EffectDefinition<StateOps<S>>, EffectHandlers];
};

const ioHandlers = createHandlers(io, {
  readFile: async (path: string) => {
    Console.log(`Reading from ${path}`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate I/O
    return `Content of ${path}`;
  },
  writeFile: async (path: string, content: string) => {
    Console.log(`Writing to ${path}: ${content}`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate I/O
  },
});

const logs: string[] = [];
const consoleHandlers = createHandlers(Console, {
  log: (message: string) => logs.push(message),
});

const randomHandlers = createHandlers(random, {
  random: () => Math.random(),
});

const [counter, counterHandlers] = createState(0);

async function exampleProgram() {
  const content = await io.readFile("example.txt");
  const value = await random.random();
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
      handlers: createHandlers(Console, {
        log: (message) => logs.push(`[log]: ${message}`),
      }),
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
      ...counterHandlers,
    },
  },
);

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
