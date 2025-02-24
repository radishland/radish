import { start } from "@radish/core";

const dev = Deno.args.includes("--dev");

await start({ dev, router: { matchers: { number: /\d+/ } } });
