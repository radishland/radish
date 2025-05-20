import { createEffect, type EffectWithId } from "@radish/effect-system";

export type HmrEvent = {
  /**
   * Indicates whether the source of the event is a file
   */
  isFile: boolean;
  /**
   * The path of the entry triggering the event
   */
  path: string;
  /**
   * The path of the original entry in the case of a rename event
   */
  from?: string;
  /**
   * The timestamp the event was triggered at
   */
  timestamp: number;
  /**
   * The kind of the underlying `FsEvent`
   */
  kind: Deno.FsEvent["kind"];
};

type HotUpdateParam = {
  event: HmrEvent;
  /**
   * The list of paths (files, folders, globs) affected by the event which need to
   * be re-built
   */
  paths: string[];
};

interface Hmr {
  start: () => void;
  update: (param: HotUpdateParam) => HotUpdateParam;
}

export const hmr: {
  start: EffectWithId<[], void>;
  update: EffectWithId<[param: HotUpdateParam], HotUpdateParam>;
} = {
  /**
   * Starts the hmr server
   */
  start: createEffect<Hmr["start"]>("hmr/start"),
  /**
   * Triggers the hot update transform
   */
  update: createEffect<Hmr["update"]>("hmr/update"),
};
