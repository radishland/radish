import { createEffect, type EffectWithId } from "@radish/effect-system";

interface IO {
  read: (path: string) => string;
  write: (path: string, content: string) => void;
}

export const io: {
  read: EffectWithId<[path: string], string>;
  write: EffectWithId<[path: string, content: string], void>;
} = {
  read: createEffect<IO["read"]>("io/read"),
  write: createEffect<IO["write"]>("io/write"),
};
