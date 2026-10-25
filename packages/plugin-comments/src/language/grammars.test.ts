import { describe, expect, it } from "bun:test";

import type { Grammar } from "./grammars.ts";

import { grammarOf, UnsupportedExtensionError } from "./grammars.ts";

describe("grammarOf", () => {
  it("[positive] 対応する拡張子のときその言語のgrammarを返す", () => {
    const grammar = grammarOf(".tsx");

    expect(grammar).toEqual({ packageName: "tree-sitter-typescript", wasmFile: "tree-sitter-tsx.wasm" });
  });

  it("[negative] 対応しない拡張子のときUnsupportedExtensionErrorを投げる", () => {
    const find = (): Grammar => grammarOf(".txt");

    expect(find).toThrow(UnsupportedExtensionError);
  });
});
