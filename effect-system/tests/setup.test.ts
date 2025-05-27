import { createEffect, Handler, handlerFor, type Plugin } from "../mod.ts";

/**
 * Console
 */

interface ConsoleOps {
  log: (message: string) => void;
}

/**
 * @internal
 */
export const Console = { log: createEffect<ConsoleOps["log"]>("console/log") };

/**
 * @internal
 */
export const logs: string[] = [];

/**
 * @internal
 */
const handleConsole = handlerFor(Console.log, (message: string) => {
  logs.push(message);
});

export const pluginConsole: Plugin = {
  name: "plugin-console",
  handlers: [handleConsole],
  onDispose: () => {
    logs.length = 0;
  },
};

/**
 * State
 */

interface StateOps<S> {
  get: () => S;
  set: (state: S) => void;
  update: (updater: (old: S) => S) => void;
}

/**
 * @internal
 */
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

/**
 * @internal
 */
export const random = createEffect<RandomOps["random"]>("random");

/**
 * @internal
 */
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

/**
 * @internal
 */
export const io = {
  readFile: createEffect<IO["readFile"]>("io/read"),
  writeFile: createEffect<IO["writeFile"]>("io/write"),
  transformFile: createEffect<
    (options: { path: string; data: string }) => { path: string; data: string }
  >("io/transform"),
};

/**
 * @internal
 */
export const handleIoReadTXT = handlerFor(io.readFile, (path: string) => {
  if (path.endsWith(".txt")) {
    return "txt content";
  }
  return Handler.continue(path);
});

/**
 * @internal
 */
export const handleIOReadBase = handlerFor(io.readFile, () => {
  return "file content";
});
