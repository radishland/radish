import { createEffect } from "./effects.ts";

interface RenderOperations {
  component: any;
  route: any;
  directive: any;
}

export const render = {
  component: createEffect<RenderOperations["component"]>("render/component"),
  route: createEffect<RenderOperations["route"]>("render/route"),
  directive: createEffect<RenderOperations["directive"]>("render/directive"),
};
