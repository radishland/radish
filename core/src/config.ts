import { existsSync } from "@std/fs/exists";
import * as JSONC from "@std/jsonc";

/**
 * returns the JSON-parsed deno config and throws if it can't find it
 */
export const readDenoConfig = () => {
  const fileName =
    ["deno.json", "deno.jsonc"].find((fileName) => existsSync(fileName)) ?? "";
  const content = Deno.readTextFileSync(fileName);

  return fileName?.endsWith(".json")
    ? JSON.parse(content)
    : JSONC.parse(content);
};
