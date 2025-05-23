import { assert, assertExists, assertObjectMatch } from "@std/assert";
import { parseArgs } from "@std/cli";
import { Spinner } from "@std/cli/unstable-spinner";
import { bold, green } from "@std/fmt/colors";
import { emptyDirSync, existsSync } from "@std/fs";
import { dirname, join } from "@std/path";

const spinner = new Spinner({ message: "Loading...", color: "green" });
const packageUrl = "https://jsr.io/@radish/init/";
const version = import.meta.url.replace(packageUrl, "").split("/")[0];

console.log("version:", version);

const args = parseArgs(Deno.args, {
  boolean: ["help", "force", "vscode"],
  default: {
    force: false,
    help: false,
    vscode: null,
  },
});

if (args.help) {
  help();
  Deno.exit(0);
}

console.log(
  `${
    green(bold("Radish:"))
  } Grow your web apps the right way: with Web Standards

`,
);

const name = args._.length === 1 ? `${args._[0]}` : prompt(`Project Name:`);
const vscode = args.vscode || confirm("\nDo you use VS Code?");

if (!name) Deno.exit(1);

const projectPath = join(Deno.cwd(), name);

if (!args.force) {
  const proceed = confirmDirOverride(projectPath);

  if (!proceed) {
    console.log("Aborted");
    Deno.exit(0);
  }
}

emptyDirSync(projectPath);

const metaURL = `${packageUrl}${version}_meta.json`;

spinner.start();
try {
  spinner.message = "Fetching meta data...";
  const res = await fetch(metaURL);
  const metadata = await res.json();
  assertObjectMatch(metadata, { manifest: {} });

  const pathsByArgs = Object.groupBy(Object.keys(metadata.manifest), (k) => {
    if (k.startsWith("/template/base/")) return "base";
    else if (k.startsWith("/template/vscode/")) return "vscode";
    return "skip";
  });

  spinner.message = "Fetching template files...";
  for (const arg of Object.keys(pathsByArgs) as (keyof typeof pathsByArgs)[]) {
    switch (arg) {
      case "skip":
        continue;

      case "vscode":
        if (!vscode) continue;
    }

    const paths = pathsByArgs[arg];
    assertExists(paths);

    const textFiles = await Promise.all(
      paths.map(async (path) => {
        const res = await fetch(`${packageUrl}${version}${path}`);
        return await res.text();
      }),
    );

    assert(paths.length === textFiles.length);

    for (let i = 0; i < paths.length; i++) {
      const path: string | undefined = paths[i];
      const content = textFiles[i];

      assertExists(path);
      assertExists(content);

      const dest = join(
        projectPath,
        path.replaceAll(new RegExp(`^/template/${arg}/`, "g"), ""),
      );

      Deno.mkdirSync(dirname(dest), { recursive: true });
      Deno.writeTextFileSync(dest, content);
    }
  }
} catch (error) {
  console.log(error);
} finally {
  spinner.stop();
}

Deno.rename(join(projectPath, "env"), join(projectPath, ".env"));
Deno.rename(join(projectPath, "denojsonc"), join(projectPath, "deno.jsonc"));

console.log(
  // deno-lint-ignore prefer-ascii
  `\n${green(bold("Project Ready!"))} 🌱\n`,
);

console.log(`
Next steps:

cd ${name}
deno install
git init && git add -A && git commit -m "Initial commit"
`);

function help() {
  console.log(`
Initialize a new Radish project. This will create all the necessary files for a
new project.

USAGE:
    deno run -A jsr:@radish/init <project_name> <options>

OPTIONS:
    --force      Overwrite existing files
    --vscode     Setup project for VS Code
`);
}

function confirmDirOverride(dirPath: string) {
  if (existsSync(dirPath, { isDirectory: true })) {
    console.warn(
      `%cThe directory ${dirPath} already exists.`,
      "color: yellow;",
    );
    return confirm(
      `This will erase files in the above directory\nContinue?`,
    );
  }
  return true;
}
