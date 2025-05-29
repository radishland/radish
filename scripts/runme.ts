import { createEffect, handlerFor, HandlerScope } from "@radish/effect-system";

interface RandomOps {
  random: () => number;
}

const random = createEffect<RandomOps["random"]>("random");
const handleRandom = handlerFor(random, () => Math.random());

using _ = new HandlerScope(handleRandom);

const num = await random();
console.log(num);
