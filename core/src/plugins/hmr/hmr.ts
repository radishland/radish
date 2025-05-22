import type { HmrEvent } from "$effects/mod.ts";
import { build, hmr, manifest, ws } from "$effects/mod.ts";
import { onDispose } from "$lib/cleanup.ts";
import {
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "$lib/constants.ts";
import type { Plugin } from "$lib/mod.ts";
import { generateImportmap } from "$lib/plugins/importmap/importmap.ts";
import { TtlCache } from "$lib/utils/cache.ts";
import { handlerFor, id } from "@radish/effect-system";
import { extname, relative } from "@std/path";

const hmrEventsCache = new TtlCache<string, HmrEvent>(200);

const handleHMRPipeline = handlerFor(hmr.pipeline, async (event: HmrEvent) => {
  const { paths } = await hmr.update({ event, paths: [event.path] });

  await manifest.write();
  await manifest.load();
  await generateImportmap();
  await build.start(paths, { incremental: true });
  await ws.send("reload");
});

export const pluginHMR: Plugin = {
  name: "plugin-hmr",
  handlers: [
    handleHMRPipeline,
    handlerFor(hmr.update, id),
    handlerFor(hmr.start, async (): Promise<void> => {
      const watcher = Deno.watchFs([
        elementsFolder,
        routesFolder,
        libFolder,
        staticFolder,
      ], { recursive: true });

      onDispose(() => {
        hmrEventsCache.clear();
        watcher.close();
        console.log("HMR closed");
      });

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
    }),
  ],
};
