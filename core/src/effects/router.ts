import type { MaybePromise } from "$lib/types.d.ts";
import { createEffect, type EffectWithId } from "@radish/effect-system";

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

export const router: {
  init: EffectWithId<[], void>;
  addRoute: EffectWithId<[route: Route], void>;
  handleRoute: EffectWithId<[context: Context], MaybePromise<Response>>;
} = {
  init: createEffect<Router["init"]>("router/init"),
  addRoute: createEffect<Router["addRoute"]>("router/add-route"),
  handleRoute: createEffect<Router["handleRoute"]>("router/handle-route"),
};
