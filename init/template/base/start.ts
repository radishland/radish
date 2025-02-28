import { start } from "$core";

const dev = Deno.args.includes("--dev");

await start({ dev });
