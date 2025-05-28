import type { MaybePromise } from "$lib/types.d.ts";
import { createEffect, type Effect } from "@radish/effect-system";

export type RouteContext = {
  request: Request;
  cookies: Record<string, string>;
  url: URL;
  headers: Headers;
  params?: URLPatternResult;
};

export type Route = {
  method: string | string[];
  pattern: URLPattern;
  handleRoute: (context: RouteContext) => MaybePromise<Response>;
};

interface RouterOps {
  init: () => void;
  addRoute: (route: Route) => void;
  handleRoute: (context: RouteContext) => MaybePromise<Response>;
}

export const router: {
  /**
   * Initializes the router
   */
  init: () => Effect<void>;
  /**
   * Adds a route
   */
  addRoute: (route: Route) => Effect<void>;
  /**
   * Handles a requested route
   */
  handleRoute: (context: RouteContext) => Effect<MaybePromise<Response>>;
} = {
  init: createEffect<RouterOps["init"]>("router/init"),
  addRoute: createEffect<RouterOps["addRoute"]>("router/add-route"),
  handleRoute: createEffect<RouterOps["handleRoute"]>("router/handle-route"),
};
