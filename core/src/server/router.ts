import { walkSync } from "@std/fs";
import { serveDir, type ServeDirOptions, serveFile } from "@std/http";
import { dirname, join } from "@std/path";
import { buildFolder, routesFolder } from "../constants.ts";
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

/**
 * The named group can provide an optional regex matcher name
 */
const square_brackets_around_named_group =
  /\[([^\]=]+)\]|\[([^\]=]+)=([^\]]+)\]/;

export class Router {
  routes: Record<string, Route[]> = {
    GET: [],
    POST: [],
  };

  get;
  post;
  defaultHandler: Handler<Context>;
  routesFolder: string;
  matchers: Record<string, RegExp>;

  constructor(
    options: {
      routesFolder: string;
      defaultHandler: Handler;
      matchers?: Record<string, RegExp>;
    },
  ) {
    this.get = this.#add.bind(this, "GET");
    this.post = this.#add.bind(this, "POST");
    this.defaultHandler = options.defaultHandler;
    this.routesFolder = options.routesFolder;
    this.matchers = options.matchers ?? {};

    const dirname = import.meta.dirname;

    if (dirname) {
      const client = join(dirname, "..", "..", "..", "runtime", "client");
      this.serveStatic({ pathname: "/_radish/runtime/*" }, {
        fsRoot: client,
        urlRoot: "_radish/runtime",
      });
    }
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

  generateFileBasedRoutes = (): void => {
    const routes: string[] = [];

    for (
      const entry of walkSync(this.routesFolder, {
        exts: [".html"],
        includeSymlinks: false,
      })
    ) {
      if (entry.name !== "index.html") continue;

      const regex = new RegExp(`^${routesFolder}/?`);
      const pathname = dirname(entry.path)
        .replace(regex, "/")
        .replace(
          square_brackets_around_named_group,
          (_match, _, namedGroup, matcherName) => {
            if (matcherName) {
              const matcher = this.matchers[matcherName];
              if (!matcher) {
                throw new Error(`Regex matcher not found: ${matcherName}`);
              }
              return `:${namedGroup}(${matcher.source})`;
            }
            return `:${namedGroup}`;
          },
        );
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
  ): void => {
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
