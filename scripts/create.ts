import { parseArgs } from "@std/cli";
import { promptSelect } from "@std/cli/unstable-prompt-select";
import { copySync, emptyDirSync, ensureDirSync, existsSync } from "@std/fs";
import { extname, relative } from "@std/path";
import { elementsFolder, routesFolder } from "../core/conventions.ts";
import { toKebabCase, toPascalCase } from "@std/text";

const args = parseArgs(Deno.args, {
  boolean: ["help"],
  string: ["name"],
  alias: {
    n: "name",
    h: "help",
  },
});

if (args.help) {
  help();
  Deno.exit(0);
}

let choice: string | null;

if (Deno.args.length === 0) {
  choice = promptSelect("What do you want to create?", [
    "custom-element",
    "web-component",
  ]);
  if (!choice) Deno.exit(1);
} else {
  choice = `${args._[0]}`;
}

const templatesFolder = "./scripts/templates/web-component";

switch (choice) {
  case "custom-element":
    {
      let name = args.name?.includes("-")
        ? args.name
        : promptCustomElementName("custom-element");

      name = toKebabCase(name);

      const destFolder = promptDest();
      const destPath = `${destFolder}/${name}.ts`;

      console.log(`Creating custom element ${name}...`);

      ensureDirSync(destFolder);

      if (existsSync(destPath, { isFile: true })) {
        console.warn(
          `%cFile ${destPath} already exists.`,
          "color: yellow;",
        );
        const ignore = promptSelect(
          `Continue? This will erase the ${destPath} file`,
          ["Yes", "No"],
        );
        if (ignore !== "Yes") {
          console.log("Aborted");
          Deno.exit(0);
        } else {
          Deno.removeSync(destPath);
        }
      }

      const customElementCode = Deno.readTextFileSync(
        `${templatesFolder}/custom-element.ts`,
      )
        .replaceAll("custom-element", name)
        .replaceAll("CustomElement", toPascalCase(name));

      Deno.writeTextFileSync(destPath, customElementCode);

      console.log(`%cDone!`, "color: green;");
    }
    break;
  case "web-component":
    {
      let name = args.name?.includes("-")
        ? args.name
        : promptCustomElementName("web-component");

      name = toKebabCase(name);
      console.log(`Creating web-component ${name}...`);

      const componentPath = `${elementsFolder}/${name}`;

      if (existsSync(componentPath, { isDirectory: true })) {
        console.warn(
          `%cPath ${componentPath} already exists.`,
          "color: yellow;",
        );
        const ignore = promptSelect(
          `Continue? This will erase the ${componentPath} directory`,
          ["Yes", "No"],
        );
        if (ignore !== "Yes") {
          console.log("Aborted");
          Deno.exit(0);
        }
      }

      emptyDirSync(componentPath);
      copySync(
        `${templatesFolder}/template.html`,
        `${componentPath}/${name}.html`,
      );

      const customElementCode = Deno.readTextFileSync(
        `${templatesFolder}/custom-element.ts`,
      )
        .replaceAll("custom-element", name)
        .replaceAll("CustomElement", toPascalCase(name));

      Deno.writeTextFileSync(
        `${componentPath}/${name}.ts`,
        customElementCode,
      );

      console.log(`%cDone!`, "color: green;");
    }
    break;

  default:
    help();
    break;
}

function promptCustomElementName(kind: string): string {
  let name = prompt(`Name of the ${kind} (kebab-case):`);

  if (!name) Deno.exit(1);
  if (!name.includes("-")) {
    console.log("A custom element name should include a dash");
    name = promptCustomElementName(kind);
  }

  return name;
}

function promptDest(): string {
  let dest = prompt(`Destination folder:`);
  if (!dest) Deno.exit(1);

  const invalid = relative(routesFolder, dest).startsWith("..") &&
      relative(elementsFolder, dest).startsWith("..") ||
    extname(dest) !== "";

  if (invalid) {
    console.warn(
      "%cThe destination should be a /routes or /elements subfolder ",
      "color:yellow;",
    );
    dest = promptDest();
  }
  return dest;
}

function help() {
  console.log(`
    Usage: create <kind> --n <name>

          <kind> = web-component | custom-element

          <name> the name of the thing to create
    `);
}
