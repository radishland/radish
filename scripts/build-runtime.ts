import typeStrip from "@fcrozatier/type-strip";
import { walkSync } from "@std/fs";
import { join } from "@std/path";
import { runtimeFolder } from "../src/conventions.ts";

for (const entry of walkSync(runtimeFolder, { exts: [".ts"], maxDepth: 1 })) {
  const dest = join(runtimeFolder, entry.name.replace(/\.ts$/, ".js"));
  const content = Deno.readTextFileSync(entry.path);

  Deno.writeTextFileSync(
    dest,
    typeStrip(content, { removeComments: true, pathRewriting: true }),
  );
}
