import { manifest } from "$effects/manifest.ts";
import { render } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../hooks/manifest/mod.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const testDataDir = join(moduleDir, "testdata");

globals();

describe("text directive", () => {
  test("renders", async () => {
    using _ = new HandlerScope(
      handlerFor(manifest.get, () => {
        return {
          ...manifestShape,
          elements: {
            "handle-text": {
              kind: "element",
              tagName: "handle-bool",
              classLoader: async () =>
                (await import("./testdata/handle-text.ts"))[
                  "HandleHtml"
                ],
            },
          },
        };
      }),
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
