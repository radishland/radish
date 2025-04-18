import { extname, relative } from "@std/path";
import {
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "../constants.ts";
import { build } from "./build.ts";
import { manifest } from "./manifest.ts";
import type { HmrEvent } from "../types.d.ts";
import { TtlCache } from "../utils/cache.ts";
import { createTransformEffect } from "./effects.ts";
import { ws } from "../server/ws.ts";
import { generateImportmap } from "../plugins/importmap.ts";

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

export const hot = {
  /**
   * Triggers the hot update transform
   */
  update: createTransformEffect<Hot["update"]>("hot/update"),
};

const hmrEvensCache = new TtlCache<string, HmrEvent>(200);
let watcher: Deno.FsWatcher | undefined;

export const startHMR = async (): Promise<void> => {
  watcher = Deno.watchFs([
    elementsFolder,
    routesFolder,
    libFolder,
    staticFolder,
  ], { recursive: true });

  console.log("HRM server watching...");

  for await (const event of watcher) {
    console.log(`FS Event`, event.kind, event.paths, Date.now());

    for (const path of event.paths) {
      const relativePath = relative(Deno.cwd(), path);
      const key = `${event.kind}:${path}`;

      if (!hmrEvensCache.has(key)) {
        const hmrEvent: HmrEvent = {
          isFile: !!extname(path),
          path: relativePath,
          kind: event.kind,
          timestamp: Date.now(),
        };
        hmrEvensCache.set(key, hmrEvent);
        await hotUpdatePipeline(hmrEvent);
      }

      // TODO: update router
      // if (!throttle.has("route")) {
      //   // Update routes
      //   if (
      //     event.paths.some((p) => common([routesPath, p]) === routesPath)
      //   ) {
      //     router.generateFileBasedRoutes();
      //   }
      //   throttle.add("route");
      // }
    }
  }
};

const hotUpdatePipeline = async (event: HmrEvent) => {
  const { paths } = await hot.update({ event, paths: [event.path] });

  await manifest.write();
  await manifest.load();
  await generateImportmap();
  await build(paths, { incremental: true });

  console.log("Hot-Reloading...");
  ws.send("reload");
};
