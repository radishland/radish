import { io } from "$effects/io.ts";
import { manifest } from "$effects/manifest.ts";
import { render } from "$effects/render.ts";
import { globals } from "$lib/constants.ts";
import { fragments } from "$lib/parser.ts";
import { handleTransformFile } from "$lib/plugins/render/hooks/io.transformFile.ts";
import { manifestShape } from "$lib/plugins/render/hooks/manifest.ts";
import { handleRouteBase } from "$lib/plugins/render/routes/base.ts";
import { handleRouteLayoutsAndHeadElements } from "$lib/plugins/render/routes/layouts-and-head.ts";
import { id } from "$lib/utils/algebraic-structures.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals, unreachable } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { handleInsertWebSocketScript } from "./hooks/render.ts";
import { config } from "$effects/mod.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const testDataDir = join(moduleDir, "testdata");

const input = await Deno.readTextFile(join(testDataDir, "index.nofmt.html"));
const output = await Deno.readTextFile(join(testDataDir, "output.nofmt.html"));
const app = await Deno.readTextFile(join(testDataDir, "_app.html"));

globals();

describe("ws plugin", () => {
  test("insert ws script", async () => {
    using _ = new HandlerScope(
      handleTransformFile,
      handleInsertWebSocketScript,
      handleRouteLayoutsAndHeadElements,
      handleRouteBase,
      handlerFor(render.transformNode, id),
      handlerFor(io.transformFile, id),
      handlerFor(io.emitTo, (path) => {
        if (path === "routes/_app.html") return "build/routes/_app.html";
        unreachable();
      }),
      handlerFor(io.readFile, (path) => {
        if (path === "build/routes/_app.html") return app;
        unreachable();
      }),
      // Runs in dev mode
      handlerFor(config.read, () => {
        return { args: { dev: true } };
      }),
      handlerFor(manifest.get, () => {
        return {
          ...manifestShape,
          elements: {},
          routes: {
            "routes/index.html": {
              kind: "route",
              path: "routes/index.html",
              files: ["routes/index.html"],
              templateLoader: () => {
                return fragments.parseOrThrow(input);
              },
              dependencies: [],
            },
          },
        };
      }),
    );

    const { content: transformed } = await io.transformFile({
      path: "routes/index.html",
      content: input,
    });

    assertEquals(transformed, output);
  });
});
