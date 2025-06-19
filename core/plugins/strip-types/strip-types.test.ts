import { pluginBuild, pluginStripTypes } from "$lib/plugins/mod.ts";
import { HandlerScope } from "../../effect-system.ts";
import { build } from "$effects/mod.ts";
import { assertEquals } from "@std/assert";

Deno.test("plugin strip-types build/dest hook", async () => {
  using _ = new HandlerScope(pluginStripTypes, pluginBuild);

  const dest1 = await build.dest("lib/util.ts");
  assertEquals(dest1, "build/lib/util.js");

  const dest2 = await build.dest("lib/util.js");
  assertEquals(dest2, "build/lib/util.js");
});
