import { createEffect, type EffectWithId } from "@radish/effect-system";

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
  start: EffectWithId<
    [
      options:
        | Deno.ServeTcpOptions
        | (Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem),
    ],
    void
  >;
  handleRequest: EffectWithId<
    [request: Request, info: Deno.ServeHandlerInfo],
    Response
  >;
} = {
  start: createEffect<Server["start"]>("server/start"),
  handleRequest: createEffect<Server["handleRequest"]>("server/handle-request"),
};
