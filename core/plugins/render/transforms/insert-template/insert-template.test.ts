import { manifest } from "$effects/manifest.ts";
import { render } from "$effects/mod.ts";
import { pluginIO, pluginRender } from "$lib/plugins/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../hooks/manifest/mod.ts";

const moduleDir = import.meta.dirname!;
const testDataDir = join(moduleDir, "testdata");

describe("render/transform template insertion", () => {
  test("inserts template", async () => {
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
      pluginIO,
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
});
