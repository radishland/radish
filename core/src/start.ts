import { dev } from "$env";
import { UserAgent } from "@std/http/user-agent";
import { App, type Handle } from "./server/app.ts";
import type { Config } from "./types.d.ts";

const handle: Handle = async ({ context, resolve }) => {
  // Avoid mime type sniffing
  context.headers.set("X-Content-Type-Options", "nosniff");

  if (!dev()) {
    const ua = new UserAgent(context.request.headers.get("user-agent") ?? "");
    console.log("ua:", ua);
  }

  return await resolve(context);
};

export const startApp = (config: Config = {}): void => {
  const dev = Deno.args.includes("--dev");

  if (dev) {
    Deno.env.set("dev", "");
  }

  new App(config, handle);
};
