import { createEffect, type EffectWithId } from "@radish/effect-system";

type FileTransformParam = { path: string; content: string };

interface IO {
  read: (path: string) => string;
  transformFile: (option: FileTransformParam) => FileTransformParam;
  emitTo: (path: string) => string;
  write: (path: string, content: string) => void;
}

export const io: {
  read: EffectWithId<[path: string], string>;
  transformFile: EffectWithId<
    [option: FileTransformParam],
    FileTransformParam
  >;
  emitTo: EffectWithId<[path: string], string>;
  write: EffectWithId<[path: string, content: string], void>;
} = {
  read: createEffect<IO["read"]>("io/read"),
  transformFile: createEffect<IO["transformFile"]>("io/transform"),
  /**
   * Returns the output path where a file or folder will be emitted
   */
  emitTo: createEffect<IO["emitTo"]>("io/emit"),
  write: createEffect<IO["write"]>("io/write"),
};
