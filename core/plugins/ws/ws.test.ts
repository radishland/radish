import { manifest } from "$effects/manifest.ts";
import { build, config, fs, render } from "$effects/mod.ts";
import { pluginFS, pluginRender, pluginWS } from "$lib/plugins/mod.ts";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals, unreachable } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../render/hooks/manifest/mod.ts";

const testDataDir = join(import.meta.dirname!, "testdata");
const app = await Deno.readTextFile(join(testDataDir, "_app.html"));

describe("ws plugin", () => {
  test("insert ws script", async () => {
    using _ = new HandlerScope(
      handlerFor(build.dest, (path) => {
        if (path === "routes/_app.html") return "build/routes/_app.html";
        unreachable();
      }),
      handlerFor(fs.read, (path) => {
        if (path === "build/routes/_app.html") return app;
        return Handler.continue(path);
      }),
      // Runs in dev mode
      handlerFor(config.read, () => {
        return { args: { dev: true } };
      }),
      handlerFor(manifest.get, () => manifestShape),
      pluginWS,
      pluginRender,
      pluginFS,
    );

    const output = await Deno.readTextFile(
      join(testDataDir, "output.nofmt.html"),
    );
    const rendered = await render.route(
      {
        kind: "route",
        path: "routes/index.html",
        files: ["routes/index.html"],
        templatePath: join(testDataDir, "index.nofmt.html"),
        dependencies: [],
      },
      "",
      "",
    );
    assertEquals(rendered, output);
  });
});
