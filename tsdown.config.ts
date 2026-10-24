import { createRequire } from "node:module";

import { defineConfig } from "tsdown";

import { grammarByExtension } from "./src/grammars.ts";

const require = createRequire(import.meta.url);

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  minify: true,
  exports: {
    legacy: false,
  },
  // wasmファイルをwasm/へ複製して公開時に同梱する
  copy: {
    from: [...new Set(grammarByExtension.values())].map((grammar) => require.resolve(`${grammar.packageName}/${grammar.wasmFile}`)),
    to: "wasm",
  },
});
