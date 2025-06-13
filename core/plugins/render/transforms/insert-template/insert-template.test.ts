import { manifest } from "$effects/manifest.ts";
import { render } from "$effects/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { fragments } from "@radish/htmlcrunch";
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../../hooks/manifest/mod.ts";
import { handleRenderTransformTerminal } from "../../transforms/mod.ts";
import { handleRenderComponents } from "../../components/component.ts";
import { handleRenderTransformInsertTemplate } from "./insert-templates.ts";

const moduleDir = import.meta.dirname!;
const testDataDir = join(moduleDir, "testdata");

describe("render/transform template insertion", () => {
  test("inserts template", async () => {
    using _ = new HandlerScope(
      handleRenderComponents,
      handleRenderTransformInsertTemplate,
      handleRenderTransformTerminal,
      handlerFor(manifest.get, () => ({
        ...manifestShape,
        elements: {
          "my-component": {
            kind: "element",
            path: "",
            files: [],
            tagName: "my-component",
            dependencies: [],
            templateLoader: () => {
              return fragments.parseOrThrow(
                Deno.readTextFileSync(join(testDataDir, "my-component.html")),
              );
            },
          },
        },
      })),
    );

    const output = await Deno.readTextFile(
      join(testDataDir, "output.nofmt.html"),
    );
    const rendered = await render.component({
      kind: "element",
      path: "",
      files: [],
      tagName: "my-input",
      dependencies: [],
      templateLoader: () => {
        return fragments.parseOrThrow(
          Deno.readTextFileSync(join(testDataDir, "input.html")),
        );
      },
    });

    assertEquals(rendered, output);
  });
});
