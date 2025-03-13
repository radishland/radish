import { startApp } from "$core";
import type { Config } from "$core/types";

const config: Config = {
  router: { matchers: { number: /\d+/ }, nodeModulesRoot: ".." },
};

startApp(config);
