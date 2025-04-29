import { dev } from "../env.ts";
import { getCookies, STATUS_CODE } from "@std/http";
import { join } from "@std/path";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "../constants.ts";
import { config as configEffect } from "../effects/config.ts";
import { startHMR } from "../effects/hot-update.ts";
import type { MaybePromise } from "../types.d.ts";
import { AppError, createStandardResponse } from "../utils/http.ts";
import { Router } from "./router.ts";
import { ws } from "./ws.ts";

export type Context = {
  request: Request;
  headers: Headers;
  cookies: Record<string, string>;
  url: URL;
};

export type Handle = (input: {
  context: Context;
  resolve: (ctx: Context) => MaybePromise<Response>;
}) => MaybePromise<Response>;

let router: Router;
let server: Deno.HttpServer<Deno.NetAddr>;
let watcher: Deno.FsWatcher | undefined;
let handle: Handle;

const defaults = {
  port: 1235,
  hostname: "127.0.0.1",
};

export const createApp = async (handler: Handle) => {
  handle = handler;

  /**
   * Router
   */
  const config = await configEffect.read();
  router = new Router({
    routesFolder,
    defaultHandler: () => {
      return createStandardResponse(STATUS_CODE.NotFound, {
        headers: { "Content-Type": "text/plain" },
      });
    },
    matchers: config.router?.matchers,
  });

  router.generateFileBasedRoutes();

  router.serveStatic({ pathname: `/${routesFolder}/*` }, {
    fsRoot: buildFolder,
  });
  router.serveStatic({ pathname: `/${elementsFolder}/*` }, {
    fsRoot: buildFolder,
  });
  router.serveStatic({ pathname: `/${libFolder}/*` }, {
    fsRoot: buildFolder,
  });
  router.serveStatic({ pathname: `/${staticFolder}/*` });

  if (dev()) {
    router.serveStatic({ pathname: `/node_modules/*` }, {
      fsRoot: join(config.router?.nodeModulesRoot ?? "."),
    });
  }

  /**
   * Server
   */

  server = Deno.serve({
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
      return createStandardResponse(STATUS_CODE.NotImplemented);
    }
    if (dev() && request.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(request);
      ws.handleWebSocket(socket);
      return response;
    }
    return handleRequest(request, info);
  });

  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);

  if (dev()) startHMR();
};

const shutdown = (): void => {
  console.log("\nShutting down gracefully...");

  ws.close();
  watcher?.close();
  server.shutdown().then(() => {
    console.log("Server closed");
    Deno.exit();
  });
};

const handleRequest: Deno.ServeHandler = async (request) => {
  try {
    const url = new URL(request.url);
    const headers = new Headers();
    const cookies = getCookies(request.headers);

    const response = await handle(
      {
        context: { request, url, headers, cookies },
        resolve: async (ctx) => await router.handler(ctx),
      },
    );

    headers.forEach((name, value) => {
      response.headers.set(name, value);
    });

    return response;
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) {
      return createStandardResponse(error.statusCode, {
        statusText: error.message,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return createStandardResponse(STATUS_CODE.InternalServerError, {
      headers: { "Content-Type": "text/plain" },
    });
  }
};
