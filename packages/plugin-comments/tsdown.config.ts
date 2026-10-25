import { createRequire } from "node:module";

import { defineConfig } from "tsdown";

import { supportedGrammars } from "./src/language/grammars.ts";

const require = createRequire(import.meta.url);

export default defineConfig({
  // wasmファイルをwasm/へ複製して公開時に同梱する
  copy: {
    from: supportedGrammars.map((grammar) => require.resolve(`${grammar.packageName}/${grammar.wasmFile}`)),
    to: "wasm",
  },
});
