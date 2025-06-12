import { createEffect, Handler, handlerFor } from "../mod.ts";
import { delay } from "@std/async";

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
export const handleConsole = handlerFor(Console.log, (message: string) => {
  logs.push(message);
});
handleConsole[Symbol.dispose] = () => {
  logs.length = 0;
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
  read: (path: string) => string;
  write: (path: string, data: string) => void;
  transform: (path: string, data: string) => string;
}

/**
 * @internal
 */
export const io = {
  read: createEffect<IO["read"]>("io/read"),
  write: createEffect<IO["write"]>("io/write"),
  transform: createEffect<IO["transform"]>("io/transform"),
};

/**
 * @internal
 */
export const handleIoReadTXT = handlerFor(io.read, (path: string) => {
  if (path.endsWith(".txt")) {
    return "txt content";
  }
  return Handler.continue(path);
});

/**
 * @internal
 */
export const handleIOReadBase = handlerFor(io.read, () => {
  return "file content";
});

/**
 * Server
 */

/**
 * @internal
 */
export const serverStart = createEffect<() => void>("server/start");

/**
 * @internal
 */
export const handlerServerStart = handlerFor(serverStart, async () => {
  await Console.log("Starting server...");
});
handlerServerStart[Symbol.asyncDispose] = async () => {
  await Console.log("Closing server...");
  await delay(100);
  await Console.log("Server closed");
};
