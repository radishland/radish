import { dev } from "$env";
import { getCookies } from "@std/http/cookie";
import { extname, isAbsolute, join, relative } from "@std/path";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "../constants.ts";
import type { Builder } from "../generate/build.ts";
import type { ManifestController } from "../generate/manifest.ts";
import type { ImportMapController } from "../generate/impormap.ts";
import type {
  HmrContext,
  HmrEvent,
  MaybePromise,
  ResolvedConfig,
} from "../types.d.ts";
import { Router } from "./router.ts";

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

/**
 * Normalizes fs events to prevent duplication and delegates processing to the builder
 */
class Hmr extends Map<string, HmrEvent> {
  /**
   * Throttle timeout in ms
   */
  #timeout = 200;
  #timers = new Set<number>();
  #app: App;

  constructor(app: App) {
    super();
    this.#app = app;
  }

  override set(key: string, value: Omit<HmrEvent, "timestamp">): this {
    super.set(key, {
      ...value,
      timestamp: Math.floor(Date.now() / this.#timeout),
    });

    const id = setTimeout(async () => {
      await this.process();
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

  process = async () => {
    const events = [...this.values()];
    this.clear();

    const paths: string[] = [];

    for (const event of events) {
      const context: HmrContext = { app: this.#app, paths: [event.path] };

      for (const plugin of this.#app.config.plugins) {
        plugin.handleHotUpdate?.(event, context);
      }

      paths.concat(context.paths);
    }

    this.#app.manifestController.write();
    const manifest = await this.#app.manifestController.loadManifest();

    if (!this.#app.importmapController.importmap) {
      await this.#app.importmapController.generate(manifest);
    }

    await this.#app.builder.build(paths);

    console.log("Hot-Reloading...");
    this.#app.ws.send("reload");
  };
}

class WebSocketServer {
  clients: Set<WebSocket> = new Set<WebSocket>();

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
  }

  send(payload: string) {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  close() {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
  }
}

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

/**
 * A file store caching `Deno.readTextFileSync` calls for efficient file access
 */
export class FileCache {
  #contents = new Map<string, string>();

  /**
   * Normalizes to relative paths to ensure unique keys
   */
  #normalizePath = (path: string) => {
    if (isAbsolute(path)) {
      path = relative(Deno.cwd(), path);
    }
    return path;
  };

  /**
   * Caches the result of `Deno.readTextFileSync` for efficient file access
   */
  readTextFileSync = (path: string): string => {
    if (this.#contents.has(path)) {
      return this.#contents.get(path)!;
    }

    path = this.#normalizePath(path);

    const content = Deno.readTextFileSync(path);
    this.#contents.set(path, content);

    return content;
  };

  /**
   * Removes a file from the cache
   */
  invalidate = (path: string) => {
    path = this.#normalizePath(path);

    return this.#contents.delete(path);
  };
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
  builder: Builder;
  config: ResolvedConfig;
  handle: Handle;
  manifestController: ManifestController;
  importmapController: ImportMapController;
  router: Router;
  server: Deno.HttpServer<Deno.NetAddr>;
  watcher: Deno.FsWatcher | undefined;
  ws: WebSocketServer = new WebSocketServer();
  fileCache: FileCache;

  constructor(
    options: {
      config: ResolvedConfig;
      handle: Handle;
      manifestController: ManifestController;
      importmapController: ImportMapController;
      builder: Builder;
      fileCache: FileCache;
    },
  ) {
    const {
      config,
      handle,
      builder,
      fileCache,
      manifestController,
      importmapController,
    } = options;

    this.config = config;
    this.handle = handle;
    this.builder = builder;
    this.fileCache = fileCache;
    this.manifestController = manifestController;
    this.importmapController = importmapController;

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

      this.watch();
    }
  }

  watch = async (): Promise<void> => {
    console.log("HRM server watching...");

    const hmr = new Hmr(this);

    for await (const event of this.watcher!) {
      console.log(`FS Event`, event.kind, event.paths, Date.now());

      for (const path of event.paths) {
        const relativePath = relative(Deno.cwd(), path);
        const key = `${event.kind}:${path}`;

        if (!hmr.has(key)) {
          hmr.set(key, {
            isFile: !!extname(path),
            path: relativePath,
            target: join(buildFolder, relativePath),
            kind: event.kind,
          });
        }

        // TODO: update router
        // if (!throttle.has("route")) {
        //   // Update routes
        //   if (
        //     event.paths.some((p) => common([routesPath, p]) === routesPath)
        //   ) {
        //     this.router.generateFileBasedRoutes();
        //   }
        //   throttle.add("route");
        // }
      }
    }
  };

  shutdown = (): void => {
    console.log("\nShutting down gracefully...");

    this.server.shutdown().then(() => {
      if (dev()) {
        this.ws.close();
        this.watcher?.close();
      }

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
