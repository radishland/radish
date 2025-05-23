import { createEffect, type Effect } from "@radish/effect-system";

interface Server {
  start: (
    options:
      | Deno.ServeTcpOptions
      | (Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem),
  ) => void;
  handleRequest: (
    request: Request,
    info: Deno.ServeHandlerInfo,
  ) => Response;
}

export const server: {
  start: (
    options:
      | Deno.ServeTcpOptions
      | (Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem),
  ) => Effect<void>;
  handleRequest: (
    request: Request,
    info: Deno.ServeHandlerInfo,
  ) => Effect<Response>;
} = {
  start: createEffect<Server["start"]>("server/start"),
  handleRequest: createEffect<Server["handleRequest"]>("server/handle-request"),
};
