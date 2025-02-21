import { ensureDirSync, walkSync } from "@std/fs";
import typeStrip from "@fcrozatier/type-strip";
import { join } from "@std/path";

const pullRuntime = () => {
  const srcPath = join("src", "runtime");
  const destPath = join("init", "template", "base", "static", "_runtime");

  ensureDirSync(destPath);

  for (const entry of walkSync(srcPath, { exts: [".ts"], maxDepth: 1 })) {
    const content = Deno.readTextFileSync(entry.path);
    Deno.writeTextFileSync(
      join(destPath, entry.name.replace(".ts", ".js")),
      typeStrip(content, {
        removeComments: true,
        tsToJsModuleSpecifiers: true,
      }),
    );
  }
};

if (import.meta.main) {
  pullRuntime();
}
