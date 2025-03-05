import { join } from "@std/path";
import { generatedFolder } from "./conventions.ts";

const env_comment = /^\s*#/;
const env_pair = /(?<key>\w+)=(?<value>\w+)/;

export const loadEnv = () => {
  const text = Deno.readTextFileSync(".env").trim();
  const lines = text.split("\n");

  let keys = 0;
  let keyType = `export type Key = `;

  for (const line of lines) {
    if (env_comment.test(line)) continue;

    const match = env_pair.exec(line);
    if (match?.groups) {
      const { key, value } = match.groups;

      if (key && value) {
        Deno.env.set(key, value);
        keyType += `| '${key}'`;
        keys += 1;
      }
    }
  }

  keyType += keys > 0 ? ";" : "string;";

  Deno.writeTextFileSync(join(generatedFolder, "env.d.ts"), keyType);
};

export const getEnv = (key: string) => {
  return Deno.env.get(key);
};

/**
 * Whether the app is running in dev mode
 */
export const dev = (): boolean => Deno.env.get("dev") !== undefined;
