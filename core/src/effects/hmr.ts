import { createEffect, type EffectWithId } from "@radish/effect-system";
import type { HmrEvent } from "$lib/types.d.ts";

type HotUpdateParam = {
  event: HmrEvent;
  /**
   * The list of paths (files, folders, globs) affected by the event which need to
   * be re-built
   */
  paths: string[];
};

interface Hot {
  update: (param: HotUpdateParam) => HotUpdateParam;
}

export const hmr: {
  update: EffectWithId<[param: HotUpdateParam], HotUpdateParam>;
} = {
  /**
   * Triggers the hot update transform
   */
  update: createEffect<Hot["update"]>("hot/update"),
};
