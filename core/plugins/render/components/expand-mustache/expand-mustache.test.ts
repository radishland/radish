import { manifest } from "$effects/manifest.ts";
import { render } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../hooks/manifest/mod.ts";

const moduleDir = import.meta.dirname!;
const testDataDir = join(moduleDir, "testdata");

globals();

describe("expands mustache syntax", () => {
  test("in text nodes", async () => {
    using _ = new HandlerScope(
      handlerFor(manifest.get, () => ({
        ...manifestShape,
        elements: {
          "handle-title": {
            kind: "element",
            classLoader: async () =>
              (await import("./testdata/handle-title.ts"))["HandleTitle"],
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
      tagName: "my-component",
      templatePath: join(testDataDir, "input.html"),
    });

    assertEquals(rendered, output);
  });
});
