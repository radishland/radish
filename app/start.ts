import { startApp } from "@radish/core";
import type { Config } from "@radish/core/types";

const config: Config = {
  router: { matchers: { number: /\d+/ }, nodeModulesRoot: ".." },
};

startApp(config);
