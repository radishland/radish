import { pluginIO } from "@radish/core/plugins";
import { createEffect, handlerFor, HandlerScope } from "@radish/effect-system";
import { dirname } from "@std/path";

interface RandomOps {
  random: () => number;
}

const random = createEffect<RandomOps["random"]>("random");
const handleRandom = handlerFor(random, () => Math.random());

using _ = new HandlerScope(handleRandom);

const num = await random();
console.log(num);

using __ = new HandlerScope(pluginIO);

const module = import.meta.url;
const moduleDir = dirname(module);
console.log("module:", module);
console.log("module:", moduleDir);
