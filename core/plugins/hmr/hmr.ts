import type { HmrEvent } from "$effects/mod.ts";
import { build, hmr, manifest, ws } from "$effects/mod.ts";
import {
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "$lib/conventions.ts";
import { generateImportmap } from "$lib/plugins/importmap/importmap.ts";
import { TtlCache } from "$lib/utils/cache.ts";
import { handlerFor, id, type Plugin } from "@radish/effect-system";
import { extname, relative } from "@std/path";

const hmrEventsCache = new TtlCache<string, HmrEvent>(200);
let watcher: Deno.FsWatcher | undefined;

/**
 * @performs
 * - `hmr/update`
 * - `manifest/write`
 * - `manifest/load`
 * - `importmap/generate`
 * - `build/start`
 * - `ws/send`
 */
const handleHMRPipeline = handlerFor(hmr.pipeline, async (event: HmrEvent) => {
  const { paths } = await hmr.update({ event, paths: [event.path] });

  await manifest.write();
  await manifest.load();
  await generateImportmap();
  for (const path of paths) {
    await build.files(path);
  }
  await ws.send("reload");
});

const handleHMRStart = handlerFor(hmr.start, async (): Promise<void> => {
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

      if (!hmrEventsCache.has(key)) {
        const hmrEvent: HmrEvent = {
          isFile: !!extname(path),
          path: relativePath,
          kind: event.kind,
          timestamp: Date.now(),
        };
        hmrEventsCache.set(key, hmrEvent);
        await hmr.pipeline(hmrEvent);
      }
    }
  }
});
handleHMRStart[Symbol.dispose] = () => {
  if (watcher) {
    hmrEventsCache.clear();
    watcher.close();
    console.log("HMR closed");
  }
};

export const pluginHMR: Plugin = {
  name: "plugin-hmr",
  handlers: [
    handleHMRStart,
    handleHMRPipeline,
    handlerFor(hmr.update, id),
  ],
};
