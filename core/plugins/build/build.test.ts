import { build } from "$effects/mod.ts";
import { pluginBuild } from "$lib/plugins/mod.ts";
import { HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { describe, test } from "@std/testing/bdd";
import { createWalkEntry } from "../../utils/fs.ts";

describe("build", () => {
  test("skips test files (only)", async () => {
    const files: Record<string, string> = {
      // Skipped
      "lib/a.test.ts": `import a from "b.ts";`,
      "elements/my-alert.spec.ts": ``,
      "routes/index.test.ts": ``,
      // Not skipped
      "elements/my-alert.ts": ``,
    };

    using _ = new HandlerScope(pluginBuild);

    const sorted = await build.sort(Object.keys(files).map(createWalkEntry));

    assertEquals(sorted.length, 1);
    assertEquals(sorted[0], createWalkEntry("elements/my-alert.ts"));
  });
});
