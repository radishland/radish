import { createEffect, createTransformEffect } from "./effects.ts";

type FileTransformParam = { path: string; content: string };

interface IO {
  readFile: (path: string) => string;
  transformFile: (option: FileTransformParam) => FileTransformParam;
  emitFile: (path: string) => string;
  writeFile: (path: string, content: string) => void;
}

export const io = {
  readFile: createEffect<IO["readFile"]>("io/read"),
  transformFile: createTransformEffect<IO["transformFile"]>("io/transform"),
  /**
   * Returns the output path where a file or folder will be emitted
   */
  emitTo: createEffect<IO["emitFile"]>("io/emit"),
  writeFile: createEffect<IO["writeFile"]>("io/write"),
};
