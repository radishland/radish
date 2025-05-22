import type { MaybePromise } from "$lib/types.d.ts";
import { createEffect, type EffectWithId } from "@radish/effect-system";

export type RouteContext = {
  request: Request;
  cookies: Record<string, string>;
  url: URL;
  params?: URLPatternResult;
};

export type Route = {
  method: string | string[];
  pattern: URLPattern;
  handleRoute: (context: RouteContext) => MaybePromise<Response>;
};

interface Router {
  init: () => void;
  addRoute: (route: Route) => void;
  handleRoute: (context: RouteContext) => MaybePromise<Response>;
}

export const router: {
  init: EffectWithId<[], void>;
  addRoute: EffectWithId<[route: Route], void>;
  handleRoute: EffectWithId<
    [context: RouteContext],
    MaybePromise<Response>
  >;
} = {
  init: createEffect<Router["init"]>("router/init"),
  addRoute: createEffect<Router["addRoute"]>("router/add-route"),
  handleRoute: createEffect<Router["handleRoute"]>("router/handle-route"),
};
