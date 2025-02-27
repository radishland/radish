import { getCookies } from "@std/http/cookie";
import type { MaybePromise } from "../types.d.ts";
import type { Router } from "./router.ts";

export type Context = {
  request: Request;
  headers: Headers;
  cookies: Record<string, string>;
  url: URL;
};

const HTTP_SERVER_ERROR_CODES = {
  // https://www.rfc-editor.org/rfc/rfc9110.html#name-client-error-4xx
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Content Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Content",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  // https://www.rfc-editor.org/rfc/rfc9110.html#name-server-error-5xx
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
} as const;

export class AppError extends Error {
  public statusCode: keyof typeof HTTP_SERVER_ERROR_CODES;

  constructor(
    statusCode: keyof typeof HTTP_SERVER_ERROR_CODES,
    ...params: ConstructorParameters<typeof Error>
  ) {
    super(...params);
    this.statusCode = statusCode;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, AppError);
  }
}

export type Handle = (input: {
  context: Context;
  resolve: (ctx: Context) => MaybePromise<Response>;
}) => MaybePromise<Response>;

export class App {
  router: Router;
  handle: Handle;

  constructor(
    router: Router,
    handle: Handle,
  ) {
    this.router = router;
    this.handle = handle;
  }

  handleRequest: Deno.ServeHandler = async (request) => {
    try {
      const url = new URL(request.url);
      const headers = new Headers();
      const cookies = getCookies(request.headers);

      const response = await this.handle(
        {
          context: { request, url, headers, cookies },
          resolve: async (ctx) => await this.router.handler(ctx),
        },
      );

      headers.forEach((name, value) => {
        response.headers.set(name, value);
      });

      return response;
    } catch (error) {
      console.error(error);
      if (error instanceof AppError) {
        return new Response(
          error.message ?? HTTP_SERVER_ERROR_CODES[error.statusCode],
          {
            status: error.statusCode,
            headers: { "Content-Type": "text/plain" },
          },
        );
      }

      return new Response(HTTP_SERVER_ERROR_CODES[500], {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }
  };
}
