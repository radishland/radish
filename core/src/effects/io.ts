import { createEffect, type EffectWithId } from "@radish/effect-system";

type FileTransformParam = { path: string; content: string };

interface IO {
  readFile: (path: string) => string;
  transformFile: (option: FileTransformParam) => FileTransformParam;
  emitTo: (path: string) => string;
  writeFile: (path: string, content: string) => void;
}

export const io: {
  readFile: EffectWithId<[path: string], string>;
  transformFile: EffectWithId<
    [option: FileTransformParam],
    FileTransformParam
  >;
  emitTo: EffectWithId<[path: string], string>;
  writeFile: EffectWithId<[path: string, content: string], void>;
} = {
  readFile: createEffect<IO["readFile"]>("io/read"),
  transformFile: createEffect<IO["transformFile"]>("io/transform"),
  /**
   * Returns the output path where a file or folder will be emitted
   */
  emitTo: createEffect<IO["emitTo"]>("io/emit"),
  writeFile: createEffect<IO["writeFile"]>("io/write"),
};
