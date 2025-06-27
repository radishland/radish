import { manifest } from "$effects/manifest.ts";
import { build, fs } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { pluginBuild, pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import type { ManifestBase } from "@radish/core";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../hooks/manifest/mod.ts";

const moduleDir = import.meta.dirname!;
const testDataDir = join(moduleDir, "testdata", "elements");

globals();

describe("expands mustache syntax", () => {
  test("in text nodes", async () => {
    const path = join(testDataDir, "my-component.html");

    let _manifest: ManifestBase = {
      ...manifestShape,
      elements: {
        "handle-title": {
          kind: "element",
          classLoader: async () =>
            (await import("./testdata/elements/handle-title.ts"))[
              "HandleTitle"
            ],
        },
        "my-component": {
          templatePath: path,
        },
      },
    };

    using _ = new HandlerScope(
      handlerFor(manifest.get, () => _manifest),
      handlerFor(manifest.set, (newManifest) => {
        _manifest = newManifest;
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

    const currentManifest = await manifest.get();
    assertEquals(currentManifest.elements["handle-title"].dependencies, [
      "r-out",
    ]);
  });
});
