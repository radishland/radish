import { io } from "$effects/io.ts";
import { manifest } from "$effects/manifest.ts";
import {
  handleManifestGet,
  handleManifestSet,
  handleManifestUpdateTerminal,
} from "$lib/plugins/manifest/manifest.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals, assertExists, assertObjectMatch } from "@std/assert";
import { describe, test } from "@std/testing/bdd";
import { createWalkEntry } from "../../../../utils/fs.ts";
import { handleManifestUpdateRenderHook } from "./manifest.update.ts";
import { manifestShape } from "./mod.ts";

describe("manifest render hook", () => {
  test("manifest/load ensures the manifest object has the right shape", async () => {
    using _ = new HandlerScope(
      handlerFor(manifest.set, () => {}),
      // handleManifestLoadRenderHook,
      // TODO replace by ref above. (ReferenceError as of 13/06/2025)
      handlerFor(
        manifest.load,
        async () => {
          const baseManifestObject = await manifest.load();
          const manifestObject = Object.assign(
            {},
            manifestShape,
            baseManifestObject,
          );
          await manifest.set(manifestObject);
          return manifestObject;
        },
        { reentrant: false },
      ),
      handlerFor(manifest.load, () => ({ imports: {} })),
    );

    const loadedManifest = await manifest.load();
    assertEquals(loadedManifest, manifestShape);
  });

  test("manifest/update populates elements and routes", async () => {
    const files: Record<string, string> = {
      "elements/my-alert/my-alert.ts": ``,
      "elements/my-button/my-button.ts": ``,
      "elements/my-carousel/my-carousel.ts": ``,
      "routes/about/index.html": ``,
    };

    using _ = new HandlerScope(
      handlerFor(io.read, (path) => {
        const content = files[path];
        assertExists(content);
        return content;
      }),
      handleManifestGet,
      handleManifestSet,
      handleManifestUpdateRenderHook,
      handleManifestUpdateTerminal,
    );

    await manifest.set(manifestShape);

    for (const path of Object.keys(files)) {
      await manifest.update(createWalkEntry(path));
    }

    assertObjectMatch(await manifest.get(), {
      imports: {},
      elements: {
        "my-alert": {
          path: "elements/my-alert", // path should be correct
          // element description
        },
        "my-button": {
          path: "elements/my-button",
          // ...
        },
        "my-carousel": {
          path: "elements/my-carousel",
          // ...
        },
      },
      routes: {
        "routes/about/index.html": {
          // route description
        },
      },
      layouts: {},
    });
  });
});
