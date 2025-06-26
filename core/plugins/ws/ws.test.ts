import { manifest } from "$effects/manifest.ts";
import { build, config, fs } from "$effects/mod.ts";
import {
  pluginBuild,
  pluginFS,
  pluginRender,
  pluginWS,
} from "$lib/plugins/mod.ts";
import { appPath } from "@radish/core/conventions";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../render/hooks/manifest/mod.ts";

const testDataDir = join(import.meta.dirname!, "testdata");
const app = await Deno.readTextFile(join(testDataDir, "_app.html"));

describe("ws plugin", () => {
  test("insert ws script", async () => {
    using _ = new HandlerScope(
      handlerFor(fs.read, (path) => {
        if (path.includes(appPath)) return app;
        return Handler.continue(path);
      }),
      // Runs in dev mode
      handlerFor(config.read, () => {
        return { args: { dev: true } };
      }),
      handlerFor(manifest.get, () => ({
        ...manifestShape,
        routes: {
          "routes/index.html": {
            kind: "route",
            path,
            files: [path],
            dependencies: [],
            templatePath: join(testDataDir, path),
          },
        },
      })),
      pluginWS,
      pluginRender,
      pluginBuild,
      pluginFS,
    );

    const output = await Deno.readTextFile(
      join(testDataDir, "output.nofmt.html"),
    );

    const path = join("routes", "index.html");
    const content = await fs.read(join(testDataDir, path));
    const rendered = await build.transform(path, content);

    assertEquals(rendered, output);
  });
});
