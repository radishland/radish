/**
 * Scaffolds a new Radish project
 *
 * ## Getting started
 *
 * ```sh
 * deno run -A jsr:@radish/init@1.0.0-alpha.xx my-rad-project
 * ```
 *
 * ### Project structure
 *
 * Your scaffolded project has the following structure:
 *
 * ```
 * my-rad-project/
 * ├ elements/ <-- custom elements, web components and unknown elements
 * ├ lib/      <-- ts utilities
 * ├ routes/   <-- routes and one-off colocated custom elements
 * ├ static/   <-- static assets served as-is
 * ├ start.ts  <-- start script and project config
 * └ deno.json
 * ```
 *
 * ## Contributors
 *
 * To scaffold from the latest **unreleased** version, provide a GitHub URL pointing to the `init` module on any branch or commit.
 *
 * You’ll also need to supply an import map to resolve module specifiers. You can use the one in the `init/` folder:
 *
 * https://raw.githubusercontent.com/radishland/radish/refs/heads/main/init/importmap.json
 *
 * Or use a local file for finer control over dependency versions.
 *
 * @example Scaffolding from GitHub (unauthenticated)
 *
 * Fetch the init module from the `main` branch, along with its sibling `importmap.json`:
 *
 * ```sh
 * deno run -A --reload --import-map https://raw.githubusercontent.com/radishland/radish/refs/heads/main/init/importmap.json https://raw.githubusercontent.com/radishland/radish/refs/heads/main/init/mod.ts
 * ```
 *
 * @example Scaffolding from GitHub (authenticated)
 *
 * If you're hitting GitHub's API rate-limits, pass a GitHub auth token to the init command.
 *
 * A read-only token (no permissions required) is sufficient. You can generate one under GitHub → Settings → Developer Settings → Personal Access Tokens.
 *
 * ```sh
 * deno run -A --reload --import-map ./importmap.json https://raw.githubusercontent.com/radishland/radish/refs/heads/main/init/mod.ts --auth github_token_1234
 * ```
 *
 * @example Scaffolding from a specific commit
 *
 * To scaffold from a specific commit, use its SHA in the URL:
 *
 * ```sh
 * deno run -A --reload --import-map ./importmap.json https://raw.githubusercontent.com/radishland/radish/<sha>/init/mod.ts --auth github_token_1234
 * ```
 *
 * @module
 */

import { fs } from "@radish/core/effects";
import { pluginFS } from "@radish/core/plugins";
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
import { UntarStream } from "@std/tar";

using _ = new HandlerScope(pluginFS);

const module = import.meta.url;
const moduleDir = dirname(module);
console.log("module:", module);

const denoConfig = await fs.read(join(moduleDir, "deno.jsonc"));
const version = await JSON.parse(denoConfig)["version"];

assertExists(version, ". Version couldn't be determined");
console.log("version:", version);

const args = parseArgs(Deno.args, {
  boolean: ["help", "force", "vscode"],
  string: ["auth"],
  default: {
    force: false,
    help: false,
    vscode: null,
  },
});

if (args.help) {
  console.log(`
Initialize a new Radish project. This will create all the necessary files for a
new project.

USAGE:
    deno run -A jsr:@radish/init <project_name> <options>

OPTIONS:
    --auth       GitHub auth token
    --force      Overwrite existing files
    --vscode     Setup project for VS Code
`);
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
  using resources = new DisposableStack();
  resources.defer(() => spinner.stop());

  spinner.start();
  spinner.message = "Fetching template files...";

  if (
    moduleDirURL.protocol === "https:" && moduleDirURL.hostname === "jsr.io"
  ) {
    const metaURL = moduleDir + `_meta.json`;
    const content = await fs.read(metaURL);
    const metadata = JSON.parse(content);
    assertObjectMatch(metadata, { manifest: {} });

    const tarballNames = [
      "base.tar.gz",
      vscode ? "vscode.tar.gz" : undefined,
    ];

    for (const tarballName of tarballNames) {
      if (!tarballName) continue;

      const path = join(moduleDir, "template", tarballName);
      const tarball = await fetch(path);
      assertExists(tarball.body);

      for await (
        const entry of tarball.body
          .pipeThrough(new DecompressionStream("gzip"))
          .pipeThrough(new UntarStream())
      ) {
        const path = join(projectPath, entry.path);
        await Deno.mkdir(dirname(path), { recursive: true });
        await entry.readable?.pipeTo((await Deno.create(path)).writable);
      }
    }
  } else if (
    moduleDirURL.protocol === "https:" &&
    moduleDirURL.hostname === "raw.githubusercontent.com"
  ) {
    const hash = moduleDirURL.pathname.split("/").at(-2);
    assertExists(hash);
    console.log("branch:", hash);

    const headers = new Headers();
    if (args.auth) {
      console.log(`auth token: ${args.auth.slice(0, 16)}****`);
      headers.set("Authorization", `token ${args.auth}`);
    }

    const content = await fetch(
      `https://api.github.com/repos/radishland/radish/git/trees/${hash}?recursive=1`,
      { headers },
    );
    const metadata: {
      tree: { path: string; type: "blob" | "tree"; sha: string; url: string }[];
    } = await content.json();
    assertObjectMatch(metadata, { tree: [] });

    const blobs = metadata.tree
      .filter((e) =>
        e.type === "blob" &&
        (vscode
          ? e.path.startsWith("init/template/base/") ||
            e.path.startsWith("init/template/vscode/")
          : e.path.startsWith("init/template/base/"))
      );

    const entries: {
      sha: string;
      content: string;
      encoding: "base64" | string & {};
    }[] = await Promise.all(
      blobs.map(async (entry) => {
        const res = await fetch(entry.url, { headers });
        return await res.json();
      }),
    );

    assert(entries.every((e) => e.encoding === "base64"));

    const decoder = new TextDecoder();
    const decodedBlobs = entries.map((e) => ({
      ...e,
      encoding: "utf-8",
      content: decoder.decode(decodeBase64(e.content.split("\n").join(""))),
      // gh content is not clean and can contain the "\n" character
    }));

    assert(blobs.length === decodedBlobs.length);

    for (const blob of blobs) {
      const { sha, path } = blob;
      const content = decodedBlobs.find((blob) => blob.sha === sha)?.content;
      assertExists(content);

      const dest = join(projectPath, ...path.split(SEPARATOR).slice(3));

      Deno.mkdirSync(dirname(dest), { recursive: true });
      await fs.write(dest, content);
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
      const content = await fs.read(path);
      const dest = join(
        projectPath,
        ...relative(templatePath, path).split(SEPARATOR).slice(1),
      );

      Deno.mkdirSync(dirname(dest), { recursive: true });
      await fs.write(dest, content);
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
  `\n${green(bold("Project Ready!"))} 🌱\n`,
);

console.log(`
Next steps:

cd ${name}
deno install
git init && git add -A && git commit -m "Initial commit"
`);

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
