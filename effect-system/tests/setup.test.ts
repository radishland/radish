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
  transform: (digits: `${number}`) => string;
}

/**
 * @internal
 */
export const number = {
  random: createEffect<RandomOps["random"]>("number/random"),
  transform: createEffect<RandomOps["transform"]>("number/transform"),
};

/** @internal */
export const handleNumberRandom = handlerFor(
  number.random,
  () => Math.random(),
);

/** @internal */
export const handleNumberTransform = handlerFor(
  number.transform,
  async (digits) => {
    if (digits.length === 0) return digits;

    const firstDigit = digits.charAt(0);
    let count = 0;

    while (digits.charAt(count) === firstDigit) {
      count++;
    }

    const prefix = `${count}${firstDigit}`;
    const remaining = digits.slice(count);

    if (remaining.length === 0) {
      return prefix;
    }

    return prefix + await number.transform(remaining as `${number}`);
  },
);

/**
 * FS
 */

interface FS {
  read: (path: string) => string;
  write: (path: string, data: string) => void;
  transform: (path: string, data: string) => string;
}

/**
 * @internal
 */
export const fs = {
  read: createEffect<FS["read"]>("fs/read"),
  write: createEffect<FS["write"]>("fs/write"),
  transform: createEffect<FS["transform"]>("fs/transform"),
};

/**
 * @internal
 */
export const handleIoReadTXT = handlerFor(fs.read, (path: string) => {
  if (path.endsWith(".txt")) {
    return "txt content";
  }
  return Handler.continue(path);
});

/**
 * @internal
 */
export const handleFSReadBase = handlerFor(fs.read, () => {
  return "file content";
});

/**
 * @internal
 */
export const handleTransformUpper = handlerFor(fs.transform, (_path, data) => {
  return data.toUpperCase();
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
