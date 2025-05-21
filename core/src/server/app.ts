import { config as configEffect } from "$effects/config.ts";
import { server } from "$effects/server.ts";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "$lib/constants.ts";
import { dev } from "$lib/environment.ts";
import type { MaybePromise } from "$lib/types.d.ts";
import { createStandardResponse } from "$lib/utils/http.ts";
import { STATUS_CODE } from "@std/http";
import { join } from "@std/path";
import { Router } from "./router.ts";

export type Context = {
  request: Request;
  cookies: Record<string, string>;
  url: URL;
};

export type Handle = (input: {
  context: Context;
  resolve: (ctx: Context) => MaybePromise<Response>;
}) => MaybePromise<Response>;

let router: Router;

const defaults = {
  port: 1235,
  hostname: "127.0.0.1",
};

export const createApp = async () => {
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

  await server.start({
    port: defaults.port,
    hostname: defaults.hostname,
    onListen: () => {
      console.log(
        `%cListening at ${defaults.hostname}:${defaults.port}`,
        "color: green",
      );
    },
  });
};
