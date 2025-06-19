import { fs } from "$effects/fs.ts";
import { manifest } from "$effects/manifest.ts";
import { pluginManifest } from "$lib/plugins/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals, assertExists, assertObjectMatch } from "@std/assert";
import { describe, test } from "@std/testing/bdd";
import { createWalkEntry } from "../../utils/fs.ts";
import { updateManifest } from "./manifest.ts";

describe("manifest", () => {
  test("skips test files", async () => {
    const files: Record<string, string> = {
      "lib/a.test.ts": `import a from "b.ts";`,
      "elements/my-alert.spec.ts": ``,
      "routes/index.test.ts": ``,
    };

    using _ = new HandlerScope(
      handlerFor(fs.read, (path) => {
        const content = files[path];
        assertExists(content);
        return content;
      }),
      pluginManifest,
    );

    await updateManifest("+(lib|elements|routes)**");

    const manifestObject = await manifest.get();

    assertEquals(manifestObject, { imports: {} });
  });

  test("manifest/update extracts imports", async () => {
    const files: Record<string, string> = {
      "lib/a.ts": `import a from "b.ts";`,
      "lib/b.js": `import a from "c.js";`,
      "elements/my-alert.ts": ``,
      "elements/my-button.ts": ``,
      "elements/my-carousel.ts": ``,
      "elements/folder": ``,
    };

    using _ = new HandlerScope(
      handlerFor(fs.read, (path) => {
        const content = files[path];
        assertExists(content);
        return content;
      }),
      pluginManifest,
    );

    for (const path of Object.keys(files)) {
      await manifest.update(createWalkEntry(path));
    }

    const manifestObject = await manifest.get();

    assertObjectMatch(manifestObject, {
      imports: {
        "lib/a.ts": ["b.ts"],
        "lib/b.js": ["c.js"],
        "elements/my-alert.ts": [],
        "elements/my-button.ts": [],
        "elements/my-carousel.ts": [],
      },
    });
  });
});
