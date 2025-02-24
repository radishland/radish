import { start } from "radish";

const dev = Deno.args.includes("--dev");

await start({ dev });
