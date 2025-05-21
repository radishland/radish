import { createEffect } from "@radish/effect-system";
import type { MaybePromise } from "$lib/types.d.ts";

export type Context = {
  request: Request;
  cookies: Record<string, string>;
  url: URL;
  params?: URLPatternResult;
};

export type RouteHandler = (context: Context) => MaybePromise<Response>;

export type Route = {
  method: string | string[];
  pattern: URLPattern;
  handler: RouteHandler;
};

interface Router {
  init: () => void;
  addRoute: (route: Route) => void;
  handleRoute: RouteHandler;
}

export const router = {
  init: createEffect<Router["init"]>("router/init"),
  addRoute: createEffect<Router["addRoute"]>("router/add-route"),
  handleRoute: createEffect<Router["handleRoute"]>("router/handle-route"),
};
