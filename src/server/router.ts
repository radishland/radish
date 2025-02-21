import { walk } from "@std/fs";
import { serveDir, type ServeDirOptions, serveFile } from "@std/http";
import { dirname, join } from "@std/path";
import {
  buildFolder,
  elementsFolder,
  libFolder,
  routesFolder,
  staticFolder,
} from "../conventions.ts";
import type { Context } from "./app.ts";

type HTTPMethod = (typeof ALLOWED_METHODS)[number];

interface RouteContext extends Context {
  params: URLPatternResult;
}

export type Handler<T extends Context = Context> = (
  ctx: T,
) => Response | (Promise<Response>);

type Route = {
  method: HTTPMethod;
  pattern: URLPattern;
  handler: Handler<RouteContext>;
};

const ALLOWED_METHODS = ["GET", "POST"] as const;

export class Router {
  routes: Record<string, Route[]> = {
    GET: [],
    POST: [],
  };

  get;
  post;
  defaultHandler;
  routesFolder;

  constructor(options: { routesFolder: string; defaultHandler: Handler }) {
    this.get = this.#add.bind(this, "GET");
    this.post = this.#add.bind(this, "POST");
    this.defaultHandler = options.defaultHandler;
    this.routesFolder = options.routesFolder;
  }

  #add = (
    method: HTTPMethod,
    patternInput: URLPatternInput,
    handler: Handler,
  ) => {
    const pattern = new URLPattern(patternInput);
    if (
      !this.routes[method].find((r) => r.pattern.pathname === pattern.pathname)
    ) {
      this.routes[method].push({ method, pattern, handler });
    }

    return this;
  };

  generateFileBasedRoutes = async () => {
    const routes: string[] = [];

    for await (
      const entry of walk(this.routesFolder, {
        exts: [".html"],
        includeSymlinks: false,
      })
    ) {
      if (entry.name !== "index.html") continue;

      const regex = new RegExp(`^${routesFolder}/?`);
      const pathname = dirname(entry.path).replace(regex, "/");
      const destPath = join(buildFolder, entry.path);
      routes.push(pathname);

      this.get(
        { pathname },
        async ({ request }) => {
          return await serveFile(request, destPath);
        },
      );
    }
    console.log("Routes", routes);
  };

  serveStatic = (
    patternInput: URLPatternInput,
    options: ServeDirOptions = { fsRoot: "." },
  ) => {
    const pattern = new URLPattern(patternInput);
    this.routes["GET"].push({
      method: "GET",
      pattern,
      handler: async ({ request }) => {
        return await serveDir(request, options);
      },
    });
  };

  handler: Handler = (ctx) => {
    // Use PatternList https://github.com/whatwg/urlpattern/pull/166
    for (const route of this.routes[ctx.request.method]) {
      const patternResult = route.pattern.exec(ctx.request.url);

      if (patternResult) {
        return route.handler({ ...ctx, params: patternResult });
      }
    }

    return this.defaultHandler(ctx);
  };
}

export const initRouter = async () => {
  const router = new Router({
    routesFolder,
    defaultHandler: () => {
      return new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    },
  });

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

  await router.generateFileBasedRoutes();

  return router;
};
