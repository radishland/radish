import { manifest } from "$effects/manifest.ts";
import { config, fs, render } from "$effects/mod.ts";
import { appPath } from "$lib/conventions.ts";
import { globals } from "$lib/globals.ts";
import { pluginBuild, pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../hooks/manifest/mod.ts";

const moduleDir = import.meta.dirname!;

globals();

describe("render/routes auto imports", () => {
  test("reuses pre-rendered templates for dependencies", async () => {
    const testDataDir = join(moduleDir, "testdata");

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
          "my-component": {
            kind: "element",
            path: "",
            files: [
              "elements/my-component/my-component.js",
              "elements/my-component/my-component.html",
            ],
            tagName: "my-component",
            dependencies: [],
            templatePath: join(testDataDir, "my-component.html"),
          },
        },
      })),
      handlerFor(config.read, () => ({})),
      pluginRender,
      pluginBuild,
      pluginFS,
    );

    const output = await Deno.readTextFile(
      join(testDataDir, "output.nofmt.html"),
    );
    const rendered = await render.route(
      {
        kind: "route",
        path: "",
        files: [],
        dependencies: ["my-component"],
        templatePath: join(testDataDir, "input.html"),
      },
      "",
      "",
    );

    assertEquals(rendered, output);
  });
});
