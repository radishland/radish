import { assertEquals, assertExists, unreachable } from "@std/assert";
import { existsSync } from "@std/fs";
import * as JSONC from "@std/jsonc";
import { join } from "@std/path";

const packages = [
  "core",
  "effect-system",
  "htmlcrunch",
  "init",
  "runtime",
  "std-elements",
] as const;

type Versions = {
  [K in typeof packages[number]]: string;
};

const getVersion = (module: string): string => {
  const cwd = Deno.cwd();

  let path = join(cwd, module, "deno.jsonc");

  if (!existsSync(path)) {
    path = join(cwd, module, "deno.json");
    const content = Deno.readTextFileSync(path);
    const version = JSON.parse(content).version;
    assertEquals(typeof version, "string");
    return version;
  }

  const content = Deno.readTextFileSync(path);
  const parsed = JSONC.parse(content)?.valueOf();

  if (typeof parsed === "object" && Object.hasOwn(parsed, "version")) {
    const version = Object.getOwnPropertyDescriptor(parsed, "version")?.value;
    assertEquals(typeof version, "string");
    return version;
  }
  unreachable();
};

const getVersions = (): Versions => {
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

let bumpInit = newVersions.init !== oldVersions.init;

// The runtime was updated
if (newVersions.runtime !== oldVersions.runtime) {
  { // Update the runtime version in runtime/package.json
    const path = join("runtime", "package.json");
    const content = Deno.readTextFileSync(path);
    const searchString = `"version": "${oldVersions.runtime}"`;
    assertExists(content.includes(searchString));

    const updated = content.replace(
      searchString,
      `"version": "${newVersions.runtime}"`,
    );
    Deno.writeTextFileSync(path, updated);
  }
}

{ // Update versions in init/template/base/denojson
  const path = join("init", "template", "base", "denojsonc");
  let content = Deno.readTextFileSync(path);

  // Core
  if (newVersions.runtime !== oldVersions.runtime) {
    const searchString =
      `"@radish/core": "jsr:@radish/core@^${oldVersions.core}"`;
    assertExists(content.includes(searchString));

    content = content.replace(
      searchString,
      `"@radish/core": "jsr:@radish/core@^${newVersions.core}"`,
    );
    bumpInit = true;
  }

  // Effect-system
  if (newVersions["effect-system"] !== oldVersions["effect-system"]) {
    const searchString =
      `"@radish/effect-system": "jsr:@radish/effect-system@^${
        oldVersions["effect-system"]
      }"`;
    assertExists(content.includes(searchString));

    content = content.replace(
      searchString,
      `"@radish/effect-system": "jsr:@radish/effect-system@^${
        newVersions["effect-system"]
      }"`,
    );
    bumpInit = true;
  }

  // Runtime
  if (newVersions.runtime !== oldVersions.runtime) {
    const searchString =
      `"@radish/runtime": "npm:@radishland/runtime@^${oldVersions.runtime}"`;
    assertExists(content.includes(searchString));

    content = content.replace(
      searchString,
      `"@radish/runtime": "npm:@radishland/runtime@^${newVersions.runtime}"`,
    );
    bumpInit = true;
  }

  // TODO add std-elements

  Deno.writeTextFileSync(path, content);
}

if (bumpInit && newVersions.init === oldVersions.init) {
  console.log("manually bump init version");
}

if (newVersions.init !== oldVersions.init) {
  { // Update the init version in init/deno.jsonc
    const path = join("init", "deno.jsonc");
    const content = Deno.readTextFileSync(path);
    const searchString = `"version": "${oldVersions.runtime}"`;
    assertExists(content.includes(searchString));

    const updated = content.replace(
      searchString,
      `"version": "${newVersions.runtime}"`,
    );
    Deno.writeTextFileSync(path, updated);
  }

  { // Update the init version in the README
    const path = "README.md";
    const content = Deno.readTextFileSync(path);
    const searchString =
      `deno run -A jsr:@radish/init@${oldVersions.init} my-rad-project`;
    assertExists(content.includes(searchString));

    const updated = content.replace(
      searchString,
      `deno run -A jsr:@radish/init@${newVersions.init} my-rad-project`,
    );
    Deno.writeTextFileSync(path, updated);
  }
}
