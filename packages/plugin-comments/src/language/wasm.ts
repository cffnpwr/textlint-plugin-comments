import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Language, Parser } from "web-tree-sitter";

import type { Grammar } from "./grammars.ts";

export class WasmFetchError extends Error {
  override readonly name = "WasmFetchError" as const;
  readonly url: string;
  // ネットワークの障害で応答を受け取れなかった場合は`undefined`
  readonly status: number | undefined;

  constructor(url: string, { status, cause }: { status?: number; cause?: unknown; }) {
    super(status === undefined ? `Failed to fetch the tree-sitter grammar .wasm file: ${url}` : `Failed to fetch the tree-sitter grammar .wasm file (HTTP status ${status}): ${url}`, { cause });
    this.url = url;
    this.status = status;
  }
}

export const wasmUrlOf = (grammar: Grammar, moduleUrl: string): URL => {
  // ビルド時にパッケージ直下の`wasm/`へ複製し、npm・JSRの公開物に同梱した`.wasm`
  const bundled = new URL(`../wasm/${grammar.wasmFile}`, moduleUrl);
  if (bundled.protocol !== "file:" || existsSync(fileURLToPath(bundled))) {
    return bundled;
  }
  // ビルド前の開発時は`wasm/`が無いため、`devDependencies`のtree-sitterのgrammarパッケージから読込
  return pathToFileURL(createRequire(moduleUrl).resolve(`${grammar.packageName}/${grammar.wasmFile}`));
};

// `Language.load`は`process.versions.node`があるとURLを`fs.readFile`で読むため、バイト列で受け渡し
export const readWasm = async (url: URL): Promise<Uint8Array> => {
  if (url.protocol === "file:") {
    return readFile(url);
  }
  const fail = (cause: unknown): never => {
    throw new WasmFetchError(url.href, { cause });
  };
  // DenoがJSRから読み込んだ場合、モジュールのURLは`https`
  const response = await fetch(url).catch(fail);
  if (!response.ok) {
    throw new WasmFetchError(url.href, { status: response.status });
  }
  return new Uint8Array(await response.arrayBuffer().catch(fail));
};

let parserInitialization: Promise<void> | undefined;
const languages = new Map<Grammar, Promise<Language>>();

export const loadLanguage = async (grammar: Grammar, moduleUrl: string): Promise<Language> => {
  parserInitialization ??= Parser.init();
  await parserInitialization;
  const cached = languages.get(grammar);
  if (cached !== undefined) {
    return cached;
  }
  const loading = readWasm(wasmUrlOf(grammar, moduleUrl)).then((bytes) => Language.load(bytes));
  languages.set(grammar, loading);
  return loading;
};
