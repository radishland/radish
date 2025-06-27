import { manifest } from "$effects/manifest.ts";
import { build, fs } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { pluginBuild, pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../../hooks/manifest/mod.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const testDataDir = join(moduleDir, "testdata", "elements");

globals();

describe("attr directive", () => {
  test("renders", async () => {
    const path = join(testDataDir, "my-component.html");

    using _ = new HandlerScope(
      handlerFor(manifest.get, () => {
        return {
          ...manifestShape,
          elements: {
            "handle-input": {
              kind: "element",
              tagName: "handle-input",
              classLoader: async () =>
                (await import("./testdata/elements/handle-input.ts"))[
                  "HandleInput"
                ],
            },
            "my-component": {
              templatePath: path,
            },
          },
        };
      }),
      pluginRender,
      pluginBuild,
      pluginFS,
    );

    const output = await Deno.readTextFile(
      join(testDataDir, "output.nofmt.html"),
    );

    const content = await fs.read(path);
    const rendered = await build.transform(path, content);

    assertEquals(rendered, output);
  });
});
