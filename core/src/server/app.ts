import { config as configEffect } from "$effects/config.ts";
import { hmr } from "$effects/mod.ts";
import { ws } from "$effects/ws.ts";
import { dispose, onDispose } from "$lib/cleanup.ts";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "$lib/constants.ts";
import { dev } from "$lib/environment.ts";
import type { MaybePromise } from "$lib/types.d.ts";
import { AppError, createStandardResponse } from "$lib/utils/http.ts";
import { getCookies, STATUS_CODE } from "@std/http";
import { join } from "@std/path";
import { Router } from "./router.ts";

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

  if (dev) {
    router.serveStatic({ pathname: `/node_modules/*` }, {
      fsRoot: join(config.router?.nodeModulesRoot ?? "."),
    });
  }

  /**
   * Server
   */

  if (dev) await ws.create();

  const server = Deno.serve({
    port: defaults.port,
    hostname: defaults.hostname,
    onListen: () => {
      console.log(
        `%cListening at ${defaults.hostname}:${defaults.port}`,
        "color: green",
      );
    },
  }, async (request, info) => {
    console.log("Request", request.method, request.url);
    if (!dev && request.headers.get("upgrade")) {
      // Not implemented: we don't support upgrades in production
      return createStandardResponse(STATUS_CODE.NotImplemented);
    }
    if (dev && request.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(request);
      await ws.handleSocket(socket);
      return response;
    }
    return handleRequest(request, info);
  });

  onDispose(async () => {
    await server.shutdown();
    console.log("Server closed");
  });

  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);

  if (dev) await hmr.start();
};

const shutdown = async () => {
  console.log("\nShutting down gracefully...");
  await dispose();
  Deno.exit();
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
