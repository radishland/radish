import { manifest } from "$effects/manifest.ts";
import { build } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { handleBuildTransformTerminal } from "$lib/plugins/build/build.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { fragments } from "@radish/htmlcrunch";
import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { handleRenderComponents } from "../../components/component.ts";
import { handleTransformFile } from "../../hooks/build.transform.ts";
import { manifestShape } from "../../hooks/manifest/mod.ts";
import { handleRenderTransformApplyDirectives } from "../../transforms/apply-directives.ts";
import { handleRenderTransformTerminal } from "../../transforms/mod.ts";
import { handleDirectiveBase } from "../mod.ts";
import { handleTextDirective } from "./text.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const testDataDir = join(moduleDir, "testdata");

globals();

describe("text directive", () => {
  test("renders", async () => {
    using _ = new HandlerScope(
      handleTransformFile,
      handleBuildTransformTerminal,
      handleRenderComponents,
      handleRenderTransformApplyDirectives,
      handleRenderTransformTerminal,
      handleTextDirective,
      handleDirectiveBase,
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
            "my-component": {
              kind: "element",
              tagName: "my-component",
              templateLoader: () => {
                return fragments.parseOrThrow(
                  Deno.readTextFileSync(join(testDataDir, "input.html")),
                );
              },
            },
          },
        };
      }),
    );

    const content = await Deno.readTextFile(join(testDataDir, "input.html"));
    const output = await Deno.readTextFile(
      join(testDataDir, "output.html"),
    );

    const transformed = await build.transform(
      "elements/my-component.html",
      content,
    );

    assertEquals(transformed, output);
  });
});
