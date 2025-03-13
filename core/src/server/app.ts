import { getCookies } from "@std/http/cookie";
import type { Config, MaybePromise } from "../types.d.ts";
import { Router } from "./router.ts";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
  ts_extension_regex,
} from "../constants.ts";
import { dev } from "$env";
import { common, extname, join, relative, resolve } from "@std/path";
import { setTimeoutWithAbort } from "../utils.ts";

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

const defaults = {
  port: 1235,
  hostname: "127.0.0.1",
};

export class App {
  watcher: Deno.FsWatcher | undefined;
  server: Deno.HttpServer<Deno.NetAddr>;
  router: Router;
  ws;
  handle: Handle;

  constructor(config: Config, handle: Handle) {
    this.handle = handle;

    /**
     * Router
     */
    this.router = new Router({
      routesFolder,
      defaultHandler: () => {
        return new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      },
      matchers: config?.router?.matchers,
    });

    this.router.generateFileBasedRoutes();

    this.router.serveStatic({ pathname: `/${routesFolder}/*` }, {
      fsRoot: buildFolder,
    });
    this.router.serveStatic({ pathname: `/${elementsFolder}/*` }, {
      fsRoot: buildFolder,
    });
    this.router.serveStatic({ pathname: `/${libFolder}/*` }, {
      fsRoot: buildFolder,
    });
    this.router.serveStatic({ pathname: `/${staticFolder}/*` });

    if (dev()) {
      this.router.serveStatic({ pathname: `/node_modules/*` }, {
        fsRoot: join(config?.router?.nodeModulesRoot ?? "."),
      });
    }

    /**
     * Web Sockets
     */

    this.ws = {
      clients: new Set<WebSocket>(),
      handleWebSocket(socket: WebSocket) {
        socket.addEventListener("open", () => {
          console.log("WebSocket Client connected");
          this.clients.add(socket);
        });
        socket.addEventListener("close", () => {
          console.log("WebSocket Client disconnected");
          this.clients.delete(socket);
        });
        socket.addEventListener("message", (e) => {
          console.log("WebSocket message", e);
        });
        socket.addEventListener("error", (e) => {
          console.log("WebSocket error", e);
        });
      },
      close() {
        for (const client of this.clients) {
          client.close();
        }
        this.clients.clear();
      },
    };

    /**
     * Server
     */

    this.server = Deno.serve({
      port: defaults.port,
      hostname: defaults.hostname,
      onListen: () => {
        console.log(
          `%cListening at ${defaults.hostname}:${defaults.port}`,
          "color: green",
        );
      },
    }, (request, info) => {
      console.log("Request", request.method, request.url);
      if (!dev() && request.headers.get("upgrade")) {
        // Not implemented: we don't support upgrades in production
        return new Response(null, { status: 501 });
      }
      if (dev() && request.headers.get("upgrade") === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(request);
        this.ws.handleWebSocket(socket);
        return response;
      }
      return this.handleRequest(request, info);
    });

    Deno.addSignalListener("SIGINT", this.shutdown);
    Deno.addSignalListener("SIGTERM", this.shutdown);

    if (dev()) {
      /**
       * Fs watcher
       */

      this.watcher = Deno.watchFs([
        elementsFolder,
        routesFolder,
        libFolder,
        staticFolder,
      ], { recursive: true });

      this.hmr();
    }
  }

  hmr = async () => {
    console.log("HRM server watching...");
    const routesPath = resolve(routesFolder);
    const buildPath = resolve(buildFolder);

    /**
     * Simple throttling mechanism to prevent duplicated File System events
     */
    class Throttle<T> extends Set<T> {
      #timeout: number;
      #timers = new Set<number>();

      /**
       * @param {number} timeout Throttle precision timeout in ms
       */
      constructor(timeout: number) {
        super();
        this.#timeout = timeout;
      }

      override add(value: T): this {
        super.add(value);

        const id = setTimeout(() => {
          super.delete(value);
          this.#timers.delete(id);
        }, this.#timeout);

        this.#timers.add(id);
        return this;
      }

      override clear(): void {
        super.clear();
        for (const id of this.#timers) {
          clearTimeout(id);
        }
        this.#timers.clear();
      }
    }

    const timeout = 200;
    const throttle = new Throttle<string>(timeout);
    const controllers = new Map<string, AbortController>();

    for await (const event of this.watcher!) {
      const time = Math.floor(Date.now() / timeout);
      console.log(`FS Event`, event, time);

      // Update generated CSS variables
      // if (
      //   event.kind === "modify" &&
      //   event.paths.every((p) => [".html", ".css"].includes(extname(p)))
      // ) {
      //   if (!throttle.has(`css`)) {
      //     console.log("Generate css variables");
      //     await generateCSS();
      //     throttle.add(`css`);
      //   }
      // }

      for (const path of event.paths) {
        const relativePath = relative(Deno.cwd(), path);
        const dest = join(buildPath, relativePath);

        if (extname(path)) {
          // File
          const key = `file:${event.kind}:${relativePath}`;
          if (!throttle.has(key)) {
            throttle.add(key);

            if (["create", "modify", "rename"].includes(event.kind)) {
              // TODO distinguish, elements, libs etc
              // await buildFile(path, dest);
              console.log("built", relativePath);
            } else if (event.kind === "remove") {
              try {
                if (dest.endsWith(".ts")) {
                  Deno.removeSync(dest.replace(ts_extension_regex, ".js"));
                } else {
                  Deno.removeSync(dest);
                }
              } catch (error) {
                if (!(error instanceof Deno.errors.NotFound)) {
                  throw error;
                }
              }
              console.log("removed", relativePath);
            }
          }
        } else {
          // Folder
          const key = `folder:${event.kind}:${relativePath}`;
          if (!throttle.has(key)) {
            throttle.add(key);

            if (event.kind === "create") {
              Deno.mkdirSync(dest);
              console.log("created", relativePath);
            } else if (event.kind === "rename") {
              let matchingSourcePath = "";

              console.log([...throttle.values()]);
              // Heuristic to find the correlated renamed source
              const found = throttle.values().find((key) => {
                if (!key.startsWith(`folder:remove:`)) return false;

                matchingSourcePath = key.split(":").at(-1) as string;
                console.log("found matchingSourcePath:", matchingSourcePath);

                return true;
              });

              if (found) {
                controllers.get(matchingSourcePath)?.abort();
                controllers.delete(matchingSourcePath);

                Deno.renameSync(join(buildPath, matchingSourcePath), dest);
                console.log(`moved ${relativePath}`);
              } else {
                console.log("couldn't find rename source folder", path);
              }
            } else if (event.kind === "remove") {
              const controller = new AbortController();
              controllers.set(relativePath, controller);

              // Postpone deletion in case it's a rename
              setTimeoutWithAbort(
                () => {
                  try {
                    Deno.removeSync(dest, { recursive: true });
                    controllers.delete(relativePath);
                    console.log("removed", relativePath);
                  } catch (error) {
                    if (!(error instanceof Deno.errors.NotFound)) {
                      throw error;
                    }
                  }
                },
                timeout,
                controller.signal,
              );
            }

            // TODO: rebuild routes
            if (!throttle.has("route")) {
              // Update routes
              if (
                event.paths.some((p) => common([routesPath, p]) === routesPath)
              ) {
                this.router.generateFileBasedRoutes();
              }
              throttle.add("route");
            }
          }
        }
      }

      // Hot-reloading
      // Reload if there was an update to an html, css, js or ts file
      if (
        !throttle.has(`full-reload`) &&
        event.kind === "modify" &&
        event.paths.some((p) =>
          [".html", ".css", ".js", ".ts"].includes(extname(p))
        )
      ) {
        throttle.add(`full-reload`);
        console.log("Hot-Reloading...");
        for (const client of this.ws.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send("full-reload");
          }
        }
      }
    }
  };

  shutdown = () => {
    console.log("\nShutting down gracefully...");

    if (dev()) {
      this.ws.close();
    }

    this.server.shutdown().then(() => {
      console.log("Server closed");

      Deno.exit();
    });
  };

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
