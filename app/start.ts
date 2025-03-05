import { start } from "@radish/core";

const dev = Deno.args.includes("--dev");

if (dev) {
  Deno.env.set("dev", "");
}

await start({ router: { matchers: { number: /\d+/ } } });
