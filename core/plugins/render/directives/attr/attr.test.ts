import { manifest } from "$effects/manifest.ts";
import { build } from "$effects/mod.ts";
import { globals } from "$lib/globals.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { fragments } from "@radish/htmlcrunch";
import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { handleRenderComponents } from "../../components/component.ts";
import { handleTransformFile } from "../../hooks/build.transform.ts";
import { manifestShape } from "../../hooks/manifest.ts";
import { handleRenderTransformApplyDirectives } from "../../transforms/apply-directives.ts";
import { handleRenderTransformTerminal } from "../../transforms/mod.ts";
import { handleDirectiveBase } from "../mod.ts";
import { handleAttrDirective } from "./attr.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const testDataDir = join(moduleDir, "testdata");

globals();

describe("attr directive", () => {
  test("renders", async () => {
    using _ = new HandlerScope(
      handleTransformFile,
      handlerFor(build.transform, (_, content) => content),
      handleRenderComponents,
      handleRenderTransformApplyDirectives,
      handleRenderTransformTerminal,
      handleAttrDirective,
      handleDirectiveBase,
      handlerFor(manifest.get, () => {
        return {
          ...manifestShape,
          elements: {
            "handle-input": {
              kind: "element",
              tagName: "handle-input",
              classLoader: async () =>
                (await import("./testdata/handle-input.ts"))["HandleInput"],
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
    const output = await Deno.readTextFile(join(testDataDir, "output.html"));

    const transformed = await build.transform(
      "elements/my-component.html",
      content,
    );

    assertEquals(transformed, output);
  });
});
