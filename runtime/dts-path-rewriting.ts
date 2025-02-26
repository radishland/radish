// This script fixes the path rewriting for ./client/index.d.ts with ts 5.7

import { join } from "@std/path";

const sourcePath = join("client", "index.d.ts");
const content = Deno.readTextFileSync(sourcePath);
Deno.writeTextFileSync(sourcePath, content.replaceAll(/\.ts/g, ".d.ts"));
