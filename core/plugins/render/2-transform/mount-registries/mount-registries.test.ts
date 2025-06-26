import { manifest } from "$effects/manifest.ts";
import { build, config, fs } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { pluginBuild, pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import { appPath } from "@radish/core/conventions";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../hooks/manifest/mod.ts";

const moduleDir = import.meta.dirname!;
const testDataDir = join(moduleDir, "testdata");

globals();

describe("render", () => {
  test("mount registries on nodes without collisions", async () => {
    using _ = new HandlerScope(
      handlerFor(fs.read, async (path) => {
        if (path.includes(appPath)) {
          return await fs.read(join(testDataDir, "_app.html"));
        }
        return Handler.continue(path);
      }, { reentrant: false }),
      handlerFor(manifest.get, () => ({
        ...manifestShape,
        elements: {
          "handle-text-a": {
            kind: "element",
            classLoader: async () =>
              (await import("./testdata/routes/handle-text-a.ts"))[
                "HandleTextA"
              ],
          },
          "handle-text-b": {
            kind: "element",
            classLoader: async () =>
              (await import("./testdata/routes/handle-text-b.ts"))[
                "HandleTextB"
              ],
          },
        },
        routes: {
          "routes/index.nofmt.html": {
            kind: "route",
            path,
            files: [path],
            dependencies: [],
            templatePath: join(testDataDir, path),
          },
        },
      })),
      handlerFor(config.read, () => ({})),
      pluginRender,
      pluginBuild,
      pluginFS,
    );

    const output = await Deno.readTextFile(
      join(testDataDir, "routes", "output.nofmt.html"),
    );

    const path = join("routes", "index.nofmt.html");
    const content = await fs.read(join(testDataDir, path));
    const rendered = await build.transform(path, content);

    assertEquals(rendered, output);
  });
});
