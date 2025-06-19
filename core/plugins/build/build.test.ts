import { build, config, fs } from "$effects/mod.ts";
import { pluginBuild } from "$lib/plugins/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";
import { describe, test } from "@std/testing/bdd";
import { createWalkEntry } from "../../utils/fs.ts";

describe("build", () => {
  test("skips test files (only)", async () => {
    const buildList: string[] = [];
    const files: { [K: string]: string } = {
      // Skipped
      "lib/a.test.ts": `import a from "b.ts";`,
      "elements/my-alert.spec.ts": ``,
      "routes/index.test.ts": ``,
      // Not skipped
      "elements/my-alert.ts": ``,
    };

    using _ = new HandlerScope(
      handlerFor(fs.exists, () => true),
      handlerFor(fs.remove, () => {}),
      handlerFor(fs.read, (path) => files[path] ?? ""),
      handlerFor(fs.walk, (_root, options) => {
        return Object.keys(files)
          .filter((path) => !options?.skip?.some((r) => r.test(path)))
          .map((path) => createWalkEntry(path));
      }),
      handlerFor(fs.write, (_path, content) => {
        buildList.push(content);
      }),
      handlerFor(config.read, () => ({})),
      handlerFor(build.file, (path) => {
        buildList.push(`building ${path}`);
      }),
      pluginBuild,
    );

    await build.files("?(lib|elements|routes)/**");

    assertEquals(buildList, ["building elements/my-alert.ts"]);
  });
});
