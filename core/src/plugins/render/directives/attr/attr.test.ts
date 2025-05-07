import { fragments } from "@radish/htmlcrunch";
import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { handlerFor } from "../../../../../exports/effects.ts";
import { globals } from "../../../../constants.ts";
import { runWith } from "../../../../effects/effects.ts";
import { io } from "../../../../effects/io.ts";
import { manifest } from "../../../../effects/manifest.ts";
import { id } from "../../../../utils/algebraic-structures.ts";
import { manifestShape } from "../../manifest.ts";
import { handleComponents } from "../../components/component.ts";
import { handleTransformFile } from "../../transformFile.ts";
import { handleApplyDirectivesTransform } from "../../transforms/apply_directives.ts";
import { handleTransformBase } from "../../transforms/mod.ts";
import { handleDirectiveBase } from "../mod.ts";
import { handleAttrDirective } from "./attr.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const testDataDir = join(moduleDir, "testdata");

globals();

describe("attr directive", () => {
  test("renders", async () => {
    await runWith(async () => {
      const content = await Deno.readTextFile(join(testDataDir, "input.html"));
      const output = await Deno.readTextFile(join(testDataDir, "output.html"));

      const { content: transformed } = await io.transformFile({
        path: "elements/my-component.html",
        content,
      });

      assertEquals(transformed, output);
    }, [
      handleTransformFile,
      handlerFor(io.transformFile, id),
      handleComponents,
      handleApplyDirectivesTransform,
      handleTransformBase,
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
    ]);
  });
});
