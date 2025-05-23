import { createEffect, type Effect } from "@radish/effect-system";

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
  pipeline: (event: HmrEvent) => void;
  update: (param: HotUpdateParam) => HotUpdateParam;
}

export const hmr: {
  /**
   * Starts the hmr server
   */
  start: () => Effect<void>;
  /**
   * Runs the hmr pipeline: performs an hmr/update, then updates the manifest and importmap, rebuilds relevant files and send a ws message
   */
  pipeline: (event: HmrEvent) => Effect<void>;
  /**
   * Lets other plugins hook into the hot update transform on an {@linkcode HmrEvent}
   *
   * This is part of the hmr/pipeline
   */
  update: (param: HotUpdateParam) => Effect<HotUpdateParam>;
} = {
  start: createEffect<Hmr["start"]>("hmr/start"),
  pipeline: createEffect<Hmr["pipeline"]>("hmr/pipeline"),
  update: createEffect<Hmr["update"]>("hmr/update"),
};
