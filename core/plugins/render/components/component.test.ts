import { manifest } from "$effects/manifest.ts";
import { render } from "$effects/mod.ts";
import { pluginFS, pluginRender } from "$lib/plugins/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import {
  assertEquals,
  assertInstanceOf,
  assertStringIncludes,
  unreachable,
} from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { manifestShape } from "../hooks/manifest/mod.ts";

const moduleDir = import.meta.dirname!;
const testDataDir = join(moduleDir, "testdata");

describe("render/component", () => {
  test("expects a template element", async () => {
    try {
      using _ = new HandlerScope(
        handlerFor(manifest.get, () => manifestShape),
        pluginRender,
        pluginFS,
      );

      await render.component({
        kind: "element",
        path: "",
        files: [],
        tagName: "my-component",
        templatePath: join(testDataDir, "input-fail-expect-template.html"),
      });
      unreachable();
    } catch (error) {
      assertInstanceOf(error, Error);
      assertStringIncludes(error.message, "Expected a template element");
    }
  });

  test("expects a shadowroot", async () => {
    try {
      using _ = new HandlerScope(
        handlerFor(manifest.get, () => manifestShape),
        pluginRender,
        pluginFS,
      );

      await render.component({
        kind: "element",
        path: "",
        files: [],
        tagName: "my-component",
        templatePath: join(testDataDir, "input-fail-expect-shadowroot.html"),
      });
      unreachable();
    } catch (error) {
      assertInstanceOf(error, Error);
      assertStringIncludes(error.message, "Expected a declarative shadow root");
    }
  });

  test("renders element", async () => {
    using _ = new HandlerScope(
      handlerFor(manifest.get, () => manifestShape),
      pluginRender,
      pluginFS,
    );

    const output = await Deno.readTextFile(
      join(testDataDir, "output.nofmt.html"),
    );
    const rendered = await render.component({
      kind: "element",
      path: "",
      files: [],
      tagName: "my-component",
      templatePath: join(testDataDir, "input.html"),
    });

    assertEquals(rendered, output);
  });
});
