import { manifest } from "$effects/manifest.ts";
import { build, fs } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../../hooks/manifest/mod.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const testDataDir = join(moduleDir, "testdata", "elements");

globals();

describe("bind directive", () => {
  test("renders", async () => {
    using _ = new HandlerScope(
      handlerFor(manifest.get, () => {
        return {
          ...manifestShape,
          elements: {
            "handle-bind": {
              kind: "element",
              tagName: "handle-bind",
              classLoader: async () =>
                (await import("./testdata/elements/handle-bind.ts"))[
                  "HandleBind"
                ],
            },
            "my-component.nofmt": {
              templatePath: path,
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

    const path = join(testDataDir, "my-component.nofmt.html");
    const content = await fs.read(path);
    const rendered = await build.transform(path, content);

    assertEquals(rendered, output);
  });
});
