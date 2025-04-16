import type { HmrEvent } from "../types.d.ts";
import { createTransformEffect } from "./effects.ts";

type HotUpdateParam = {
  event: HmrEvent;
  /**
   * The list of paths (files, folders, globs) affected by the event which need to
   * be re-built
   */
  paths: string[];
};
type HotUpdate = (param: HotUpdateParam) => HotUpdateParam;

export const hotUpdate = createTransformEffect<HotUpdate>("hot/update");
