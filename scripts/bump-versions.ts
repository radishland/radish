import { join } from "@std/path";
import {} from "@std/fs";
import { existsSync } from "node:fs";

const getVersion = (module: string) => {
  const cwd = Deno.cwd();
  let path = join(cwd, `${module}/deno.json`);

  if (!existsSync(path)) {
    path = join(cwd, `${module}/deno.jsonc`);
  }

  const content = Deno.readTextFileSync(path);

  return JSON.parse(content).version;
};

type Versions = {
  [K in "core" | "effect-system" | "htmlcrunch" | "init" | "runtime"]: string;
};

const getVersions = (): Versions => {
  const packages = ["core", "effect-system", "htmlcrunch", "init", "runtime"];
  return Object.fromEntries(
    packages.map((p) => [p, getVersion(p)]),
  ) as Versions;
};

const oldVersions = getVersions();
console.log(" oldVersions:", oldVersions);

const command = new Deno.Command("deno", {
  args: ["run", "-A", "jsr:@deno/bump-workspaces@0.1.22/cli"],
  stdout: "inherit",
  stdin: "inherit",
});

await command.output();

const newVersions = getVersions();
console.log(" newVersions:", newVersions);
