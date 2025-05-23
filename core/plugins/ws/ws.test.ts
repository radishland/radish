import { manifest } from "$effects/manifest.ts";
import { build, config, io } from "$effects/mod.ts";
import { render } from "$effects/render.ts";
import { fragments } from "$lib/parser.ts";
import { handleBuildTransformCanonical } from "$lib/plugins/build/build.ts";
import { handleTransformFile } from "$lib/plugins/render/hooks/build.transform.ts";
import { manifestShape } from "$lib/plugins/render/hooks/manifest.ts";
import { handleRouteBase } from "$lib/plugins/render/routes/base.ts";
import { handleRouteLayoutsAndHeadElements } from "$lib/plugins/render/routes/layouts-and-head.ts";
import { id } from "$lib/utils/algebraic-structures.ts";
import { Handler, handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals, unreachable } from "@std/assert";
import { join } from "@std/path";
import { describe, test } from "@std/testing/bdd";
import { handleIORead } from "../io.ts";
import { handleInsertWebSocketScript } from "./hooks/render.route.ts";

const testDataDir = join(import.meta.dirname!, "testdata");
const input = await Deno.readTextFile(join(testDataDir, "index.nofmt.html"));
const output = await Deno.readTextFile(join(testDataDir, "output.nofmt.html"));
const app = await Deno.readTextFile(join(testDataDir, "_app.html"));

describe("ws plugin", () => {
  test("insert ws script", async () => {
    using _ = new HandlerScope(
      handleTransformFile,
      handleInsertWebSocketScript,
      handleRouteLayoutsAndHeadElements,
      handleRouteBase,
      handlerFor(render.transformNode, id),
      handleBuildTransformCanonical,
      handlerFor(build.dest, (path) => {
        if (path === "routes/_app.html") return "build/routes/_app.html";
        unreachable();
      }),
      handlerFor(io.read, (path) => {
        if (path === "build/routes/_app.html") return app;
        return Handler.continue(path);
      }),
      // Needs to retrieve the ws script to insert
      handleIORead,
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

    const transformed = await build.transform("routes/index.html", input);
    assertEquals(transformed, output);
  });
});
