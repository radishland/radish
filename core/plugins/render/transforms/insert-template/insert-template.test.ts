import { manifest } from "$effects/manifest.ts";
import { build, fs, render } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { pluginBuild, pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../hooks/manifest/mod.ts";

const moduleDir = import.meta.dirname!;

globals();

describe("render/transform template insertion", () => {
  test("inserts templates", async () => {
    const testDataDir = join(moduleDir, "testdata", "insert");

    using _ = new HandlerScope(
      handlerFor(manifest.get, () => ({
        ...manifestShape,
        elements: {
          "my-component": {
            kind: "element",
            path: "",
            files: [],
            tagName: "my-component",
            dependencies: [],
            templatePath: join(testDataDir, "my-component.html"),
          },
        },
      })),
      pluginRender,
      pluginFS,
    );

    const output = await Deno.readTextFile(
      join(testDataDir, "output.nofmt.html"),
    );
    const rendered = await render.component({
      kind: "element",
      path: "",
      files: [],
      tagName: "my-input",
      dependencies: [],
      templatePath: join(testDataDir, "input.html"),
    });

    assertEquals(rendered, output);
  });

  test("reuses pre-rendered templates for dependencies", async () => {
    const testDataDir = join(moduleDir, "testdata", "built-templates");

    using _ = new HandlerScope(
      handlerFor(fs.read, async (path) => {
        // this is wrong but ok for testing (`join` normalizes paths) but in reality we have workspace relative paths anyway
        const dest = await build.dest(join(testDataDir, "my-component.html"));
        if (path.includes(dest)) {
          return await fs.read(join(testDataDir, "my-component.built.html"));
        }
        return Handler.continue(path);
      }, { reentrant: false }),
      handlerFor(manifest.get, () => ({
        ...manifestShape,
        elements: {
          "my-component": {
            kind: "element",
            path: "",
            files: [],
            tagName: "my-component",
            dependencies: [],
            templatePath: join(testDataDir, "my-component.html"),
            classLoader: async () =>
              (await import("./testdata/built-templates/my-component.ts"))[
                "MyComponent"
              ],
          },
        },
      })),
      pluginRender,
      pluginBuild,
      pluginFS,
    );

    const output = await Deno.readTextFile(
      join(testDataDir, "output.nofmt.html"),
    );
    const rendered = await render.component({
      kind: "element",
      path: "",
      files: [],
      tagName: "my-input",
      dependencies: ["my-component"],
      templatePath: join(testDataDir, "input.html"),
    });

    assertEquals(rendered, output);
  });
});
