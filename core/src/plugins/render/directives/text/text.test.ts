import { manifest } from "$effects/manifest.ts";
import { build } from "$effects/mod.ts";
import { globals } from "$lib/constants.ts";
import { id } from "$lib/utils/algebraic-structures.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { fragments } from "@radish/htmlcrunch";
import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { handleComponents } from "../../components/component.ts";
import { handleTransformFile } from "../../hooks/build.transform.ts";
import { manifestShape } from "../../hooks/manifest.ts";
import { handleApplyDirectivesTransform } from "../../transforms/apply-directives.ts";
import { handleTransformBase } from "../../transforms/mod.ts";
import { handleDirectiveBase } from "../mod.ts";
import { handleTextDirective } from "./text.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const testDataDir = join(moduleDir, "testdata");

globals();

describe("text directive", () => {
  test("renders", async () => {
    using _ = new HandlerScope(
      handleTransformFile,
      handlerFor(build.transform, id),
      handleComponents,
      handleApplyDirectivesTransform,
      handleTransformBase,
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

    const { content: transformed } = await build.transform({
      path: "elements/my-component.html",
      content,
    });

    assertEquals(transformed, output);
  });
});
