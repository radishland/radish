import { parseArgs } from "@std/cli/parse-args";
import { Spinner } from "@std/cli/unstable-spinner";
import { bold, green } from "@std/fmt/colors";
import { emptyDirSync, existsSync } from "@std/fs";
import { dirname, join } from "@std/path";
import { UntarStream } from "@std/tar";

const spinner = new Spinner({ message: "Loading...", color: "green" });

const version =
  import.meta.url.replace("https://jsr.io/@radish/init/", "").split("/")[0];

console.log("version:", version);

const args = parseArgs(Deno.args, {
  boolean: ["help", "force", "vscode"],
  alias: {
    h: "help",
  },
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
  `
  ${
    green(bold("Radish:"))
  } Grow your web apps the right way: around Web Standards
  `,
);

const name = args._.length === 1 ? `${args._[0]}` : prompt(`Project Name:`);
const vsCode = args.vscode || confirm("\nDo you use VS Code?");

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

const initURL = `https://jsr.io/@radish/init/${version}/template/`;

spinner.start();
try {
  await loadTar({
    baseUrl: initURL,
    file: "base.tar.gz",
    to: projectPath,
    spinner,
  });

  if (vsCode) {
    await loadTar({
      baseUrl: initURL,
      file: "vscode.tar.gz",
      to: projectPath,
      spinner,
      spinnerMessage: "Loading VS Code files...",
      errorMessage: "Failed to download VS Code files",
    });
  }
} catch (error) {
  console.log(error);
} finally {
  spinner.stop();
}

Deno.rename(join(projectPath, "env"), join(projectPath, ".env"));

console.log(
  `
${green(bold("Project Ready!"))} 🌱
`,
);

console.log(
  `
Next steps:
    cd ${name}
    deno install
    git init && git add -A && git commit -m "Initial commit"
      `,
);

function help() {
  console.log(`
Initialize a new Radish project. This will create all the necessary files for a
new project.

To generate a project in the './foo' directory:
  deno run -A jsr:@radish/init my-radish-project

USAGE:
    deno run -A jsr:@radish/init [NAME] [OPTIONS]

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

/**
 * Extract a compressed tar archive from a ReadableStream
 */
async function untar(
  options: { from: ReadableStream<Uint8Array>; to: string },
) {
  for await (
    const entry of options.from
      .pipeThrough(new DecompressionStream("gzip"))
      .pipeThrough(new UntarStream())
  ) {
    const path = join(options.to, entry.path);

    await Deno.mkdir(dirname(path), { recursive: true });
    await entry.readable?.pipeTo((await Deno.create(path)).writable);
  }
}

/**
 * Fetch a tar archive and call the extraction procedure
 */
export async function loadTar(
  {
    baseUrl,
    file,
    to,
    errorMessage = "Failed to download files",
    spinner,
    spinnerMessage = "Loading files...",
  }: {
    baseUrl: string;
    file: `${string}.tar.gz`;
    to: string;
    errorMessage?: string;
    spinner?: Spinner;
    spinnerMessage?: string;
  },
) {
  if (spinner) {
    spinner.message = spinnerMessage;
  }

  const response = await fetch(new URL(file, baseUrl));

  if (!response.ok || !response.body) {
    throw new Error(errorMessage);
  }
  await untar({ from: response.body, to });
}
