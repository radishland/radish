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

const getVersions = () => {
  const packages = ["core", "effect-system", "htmlcrunch", "init", "runtime"];
  return Object.fromEntries(packages.map((p) => [p, getVersion(p)]));
};

getVersions();
