import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/boot.ts", "src/utils.ts"],
  outDir: "client",
  clean: true,
  format: "esm",
  target: "esnext",
  platform: "node",
  bundle: true,
  dts: true,
  treeshake: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  tsconfig: "tsconfig.json",
  env: {
    NODE_ENV: "production",
  },
});
