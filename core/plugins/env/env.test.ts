import { config } from "$effects/config.ts";
import { env } from "$effects/env.ts";
import { fs } from "$effects/fs.ts";
import { pluginEnv } from "$lib/plugins/mod.ts";
import { handlerFor, HandlerScope } from "@radish/effect-system";
import { assertEquals } from "@std/assert";

const handlers = [
  handlerFor(
    config.read,
    () => ({
      args: {
        build: false,
        dev: false,
        env: true,
        importmap: false,
        manifest: false,
        server: false,
      },
    }),
  ),

  handlerFor(fs.read, () => envFile),
  handlerFor(fs.write, (_path, content) => {
    result = content;
  }),
];

const envFile = `
A=unquoted

B='single'
  C="double"
D=
E = 1
F=true
G={"a":true, "b":26, "c":"c"} # Comment
# COMMENT
PROTO=https://
URL=\${PROTO}example.com
`.trim();

const expected = `
export const A = "unquoted";
export const B = "single";
export const C = "double";
export const D = undefined;
export const E = 1;
export const F = true;
export const G = {a: true,b: 26,c: "c",};
export const PROTO = "https://";
export const URL = "https://example.com";
`.trim();

let result: string | undefined;

Deno.test("env plugin", async () => {
  using _ = new HandlerScope(...handlers, ...pluginEnv.handlers);

  await env.load();

  assertEquals(result?.trim(), expected);
});
