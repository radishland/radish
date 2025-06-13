import { io } from "$effects/io.ts";
import { manifest } from "$effects/manifest.ts";
import {
  handleManifestGet,
  handleManifestSet,
  handleManifestUpdateTerminal,
} from "$lib/plugins/manifest/manifest.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertExists, assertObjectMatch } from "@std/assert";
import type { WalkEntry } from "@std/fs";
import { basename } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { handleManifestUpdateRenderHook } from "./manifest.update.ts";
import { manifestShape } from "./mod.ts";

const createWalkEntry = (path: string): WalkEntry => {
  return {
    isDirectory: false,
    isFile: true,
    path,
    name: basename(path),
    isSymlink: false,
  };
};

describe("manifest", () => {
  test("manifest/update ", async () => {
    const files: Record<string, string> = {
      "elements/my-alert/my-alert.ts": ``,
      "elements/my-button/my-button.ts": ``,
      "elements/my-carousel/my-carousel.ts": ``,
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
          files: [
            "elements/my-alert/my-alert.ts",
          ],
          kind: "element",
          path: "my-alert",
          tagName: "my-alert",
        },
        "my-button": {
          files: [
            "elements/my-button/my-button.ts",
          ],
          kind: "element",
          path: "my-button",
          tagName: "my-button",
        },
        "my-carousel": {
          files: [
            "elements/my-carousel/my-carousel.ts",
          ],
          kind: "element",
          path: "my-carousel",
          tagName: "my-carousel",
        },
      },
      routes: {},
      layouts: {},
    });
  });
});
