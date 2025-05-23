// deno-coverage-ignore-file

import { createEffect, Handler, handlerFor } from "../mod.ts";

/**
 * Console
 */

interface ConsoleOps {
  log: (message: string) => void;
}

export const Console = { log: createEffect<ConsoleOps["log"]>("console/log") };

export const logs: string[] = [];

export const handleConsole = handlerFor(Console.log, (message: string) => {
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

export const createState = <S>(initialState: S) => {
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
 * Random
 */

interface RandomOps {
  random: () => number;
}

export const random = createEffect<RandomOps["random"]>("random");

export const handleRandom = handlerFor(random, () => Math.random());

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

export const io = {
  readFile: createEffect<IO["readFile"]>("io/read"),
  writeFile: createEffect<IO["writeFile"]>("io/write"),
  transformFile: createEffect<
    (options: { path: string; data: string }) => { path: string; data: string }
  >("io/transform"),
};

export const handleIoReadTXT = handlerFor(io.readFile, (path: string) => {
  if (path.endsWith(".txt")) {
    return "txt content";
  }
  return Handler.continue(path);
});

export const handleIOReadBase = handlerFor(io.readFile, () => {
  return "file content";
});
