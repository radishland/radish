import { io } from "@radish/core/effects";
import { pluginIO } from "@radish/core/plugins";
import { HandlerScope } from "@radish/effect-system";
import {
  assert,
  assertExists,
  assertObjectMatch,
  unimplemented,
} from "@std/assert";
import { parseArgs } from "@std/cli";
import { Spinner } from "@std/cli/unstable-spinner";
import { decodeBase64 } from "@std/encoding";
import { bold, green } from "@std/fmt/colors";
import { emptyDirSync, existsSync, walkSync } from "@std/fs";
import { dirname, join, relative, SEPARATOR } from "@std/path";

using _ = new HandlerScope(pluginIO);

const module = import.meta.url;
const moduleDir = dirname(module);
console.log("module:", module);

const denoConfig = await io.read(join(moduleDir, "deno.jsonc"));
const version = await JSON.parse(denoConfig)["version"];

assertExists(version, ". Version couldn't be determined");
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

const moduleDirURL = new URL(moduleDir);
const spinner = new Spinner({ message: "Loading...", color: "green" });

try {
  using spinnerScope = new DisposableStack();
  spinnerScope.defer(() => spinner.stop());

  spinner.start();
  spinner.message = "Fetching template files...";

  if (
    moduleDirURL.protocol === "https:" && moduleDirURL.hostname === "jsr.io"
  ) {
    const metaURL = join(moduleDir, `${version}_meta.json`);
    const content = await io.read(metaURL);
    const metadata = JSON.parse(content);
    assertObjectMatch(metadata, { manifest: {} });

    const paths = Object.keys(metadata.manifest).filter((k) =>
      vscode
        ? k.startsWith("/template/base/") || k.startsWith("/template/vscode/")
        : k.startsWith("/template/base/")
    );

    const textFiles: string[] = await Promise.all(
      paths.map(async (path) => await io.read(join(moduleDir, version, path))),
    );

    assert(paths.length === textFiles.length);

    for (let i = 0; i < paths.length; i++) {
      const path: string | undefined = paths[i];
      const content = textFiles[i];

      assertExists(path);
      assertExists(content);

      const dest = join(projectPath, ...path.split(SEPARATOR).slice(3));

      Deno.mkdirSync(dirname(dest), { recursive: true });
      await io.write(dest, content);
    }
  } else if (
    moduleDirURL.protocol === "https:" &&
    moduleDirURL.hostname === "raw.githubusercontent.com"
  ) {
    const hash = moduleDirURL.pathname.split("/").at(-2);
    assertExists(hash);
    console.log("branch:", hash);

    const content = await fetch(
      `https://api.github.com/repos/radishland/radish/git/trees/${hash}?recursive=1`,
    );
    const metadata: { tree: { path: string; type: "blob" | "tree" }[] } =
      await content.json();
    assertObjectMatch(metadata, { tree: [] });

    const paths = metadata.tree
      .filter((e) =>
        e.type === "blob" &&
        (vscode
          ? e.path.startsWith("init/template/base/") ||
            e.path.startsWith("init/template/vscode/")
          : e.path.startsWith("init/template/base/"))
      ).map((e) => e.path);

    console.log(paths);

    const entries: {
      type: "file" | string & {};
      content: string;
      encoding: "base64" | string & {};
    }[] = await Promise.all(
      paths.map(async (path) =>
        JSON.parse(
          await io.read(
            join(
              "https://api.github.com/repos/radishland/radish/contents/",
              path,
            ),
          ),
        )
      ),
    );

    assert(entries.every((e) => e.type === "file" && e.encoding === "base64"));

    const textFiles = entries.map((e) =>
      new TextDecoder().decode(decodeBase64(e.content))
    );

    assert(paths.length === textFiles.length);

    for (let i = 0; i < paths.length; i++) {
      const path: string | undefined = paths[i];
      const content = textFiles[i];

      assertExists(path);
      assertExists(content);

      const dest = join(projectPath, ...path.split(SEPARATOR).slice(3));

      Deno.mkdirSync(dirname(dest), { recursive: true });
      await io.write(dest, content);
    }
  } else if (moduleDirURL.protocol === "file:") {
    const templatePath = join(moduleDirURL.pathname, "template");
    const basePath = join(templatePath, "base");
    const vscodePath = join(templatePath, "vscode");

    const paths = Array.from(walkSync(templatePath))
      .filter((e) =>
        e.isFile && (vscode
          ? e.path.startsWith(basePath) ||
            e.path.startsWith(vscodePath)
          : e.path.startsWith(basePath))
      )
      .map((e) => e.path);

    for (const path of paths) {
      const content = await io.read(path);
      const dest = join(
        projectPath,
        ...relative(templatePath, path).split(SEPARATOR).slice(1),
      );

      Deno.mkdirSync(dirname(dest), { recursive: true });
      await io.write(dest, content);
    }
  } else {
    unimplemented("init method");
  }

  Deno.rename(join(projectPath, "env"), join(projectPath, ".env"));
  Deno.rename(join(projectPath, "gitignore"), join(projectPath, ".gitignore"));
  Deno.rename(join(projectPath, "denojsonc"), join(projectPath, "deno.jsonc"));
} catch (error) {
  console.log(error);
}

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
