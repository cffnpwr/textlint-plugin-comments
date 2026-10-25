import { defineConfig } from "tsdown";

export default defineConfig({
  workspace: "packages/*",
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  minify: true,
  exports: {
    devExports: true,
    legacy: false,
  },
});
