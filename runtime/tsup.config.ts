import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/boot.ts"],
  format: "esm",
  platform: "node",
  bundle: true,
  dts: true,
  treeshake: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  target: "esnext",
  outDir: "client",
  clean: true,
  tsconfig: "tsconfig.json",
  env: {
    NODE_ENV: "production",
  },
});
