import { manifest } from "$effects/manifest.ts";
import { build, config, fs } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { pluginBuild, pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import {
  assertEquals,
  assertInstanceOf,
  assertStringIncludes,
  unreachable,
} from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../hooks/manifest/mod.ts";
import { appPath } from "@radish/core/conventions";

const moduleDir = import.meta.dirname!;
const testDataDir = join(moduleDir, "testdata");

globals();

describe("render", () => {
  test("expects a template element", async () => {
    try {
      using _ = new HandlerScope(
        handlerFor(manifest.get, () => ({
          ...manifestShape,
          elements: {
            "input-fail-expect-template": {
              templatePath: path,
            },
          },
        })),
        pluginRender,
        pluginBuild,
        pluginFS,
      );

      const path = join(
        testDataDir,
        "elements",
        "input-fail-expect-template.html",
      );
      const content = await fs.read(path);
      await build.transform(path, content);
      unreachable();
    } catch (error) {
      assertInstanceOf(error, Error);
      assertStringIncludes(error.message, "Expected a template element");
    }
  });

  test("expects a shadowroot", async () => {
    try {
      using _ = new HandlerScope(
        handlerFor(manifest.get, () => ({
          ...manifestShape,
          elements: {
            "input-fail-expect-shadowroot": {
              templatePath: path,
            },
          },
        })),
        pluginRender,
        pluginFS,
      );

      const path = join(
        testDataDir,
        "elements",
        "input-fail-expect-shadowroot.html",
      );
      const content = await fs.read(path);
      await build.transform(path, content);

      unreachable();
    } catch (error) {
      assertInstanceOf(error, Error);
      assertStringIncludes(error.message, "Expected a declarative shadow root");
    }
  });

  test("inserts templates", async () => {
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
              "elements/my-component/my-component.ts",
              "elements/my-component/my-component.html",
            ],
            tagName: "my-component",
            dependencies: [],
            templatePath: join(
              testDataDir,
              "elements",
              "my-component",
              "my-component.html",
            ),
            classLoader: async () =>
              (await import(
                "./testdata/elements/my-component/my-component.ts"
              ))[
                "MyComponent"
              ],
          },
        },
        routes: {
          "routes/index.html": {
            kind: "route",
            path,
            files: [path],
            dependencies: ["my-component"],
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

    const path = join("routes", "index.html");
    const content = await fs.read(join(testDataDir, path));
    const rendered = await build.transform(path, content);

    assertEquals(rendered, output);
  });
});
