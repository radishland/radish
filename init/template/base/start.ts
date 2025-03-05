import { start } from "$core";

const dev = Deno.args.includes("--dev");

if (dev) {
  Deno.env.set("dev", "");
}

await start();
