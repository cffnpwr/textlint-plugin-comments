import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import * as fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { loadLanguage, readWasm, WasmFetchError, wasmUrlOf } from "./wasm.ts";

const bundledWasmPath = "/package/wasm/tree-sitter-go.wasm";

const grammar = { packageName: "tree-sitter-go", wasmFile: "tree-sitter-go.wasm" };

// ビルド成果物の`wasm/`の有無に結果が左右されないよう、`wasm/`は架空のパッケージにだけ存在
await mock.module("node:fs", () => ({ ...fs, existsSync: (path: string) => path === bundledWasmPath }));

describe("wasmUrlOf", () => {
  it.each([
    { condition: "モジュールのURLがhttpsの", moduleUrl: "https://jsr.io/@scope/name/1.0.0/src/index.ts", expected: "https://jsr.io/@scope/name/1.0.0/wasm/tree-sitter-go.wasm" },
    { condition: "モジュールのURLがfileでwasm/がある", moduleUrl: "file:///package/src/index.ts", expected: `file://${bundledWasmPath}` },
  ])("[positive] $conditionときwasm/の.wasmのURLを返す", ({ moduleUrl, expected }) => {
    const url = wasmUrlOf(grammar, moduleUrl);

    expect(url.href).toBe(expected);
  });

  it("[positive] モジュールのURLがfileでwasm/が無いときgrammarパッケージの.wasmのURLを返す", () => {
    // workspaceの依存は`node_modules/.bun/`の実体へのsymlinkのため、実体のパスと比較
    const installedWasm = fs.realpathSync(fileURLToPath(new URL("../../node_modules/tree-sitter-go/tree-sitter-go.wasm", import.meta.url)));

    const url = wasmUrlOf(grammar, import.meta.url);

    expect(url.href).toBe(pathToFileURL(installedWasm).href);
  });
});

describe("readWasm", () => {
  const wasmMagicNumber = new TextEncoder().encode("\0asm");
  const server = setupServer(
    http.get("https://example.com/wasm/tree-sitter-go.wasm", () => HttpResponse.arrayBuffer(wasmMagicNumber.buffer)),
    http.get("https://example.com/wasm/missing.wasm", () => new HttpResponse(null, { status: 404 })),
    http.get("https://example.com/wasm/unreachable.wasm", () => HttpResponse.error()),
    http.get("https://example.com/wasm/interrupted.wasm", () => new HttpResponse(new ReadableStream({
      start(controller) {
        controller.error(new Error("interrupted"));
      },
    }))),
  );

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterAll(() => {
    server.close();
  });

  it("[positive] URLがhttpsで取得に成功したとき応答のバイト列を返す", async () => {
    const result = await readWasm(new URL("https://example.com/wasm/tree-sitter-go.wasm"));

    expect(result).toEqual(wasmMagicNumber);
  });

  it("[negative] URLがhttpsで応答のステータスが成功でないときWasmFetchErrorを投げる", async () => {
    const read = readWasm(new URL("https://example.com/wasm/missing.wasm"));

    await expect(read).rejects.toThrow(WasmFetchError);
  });

  it.each([
    { condition: "接続に失敗した", path: "unreachable.wasm" },
    { condition: "応答の本文の受信に失敗した", path: "interrupted.wasm" },
  ])("[negative] URLがhttpsで$conditionときWasmFetchErrorを投げる", async ({ path }) => {
    const read = readWasm(new URL(`https://example.com/wasm/${path}`));

    await expect(read).rejects.toThrow(WasmFetchError);
  });
});

describe("loadLanguage", () => {
  it("[positive] 同じgrammarを2回読み込んだとき同じLanguageを返す", async () => {
    const first = await loadLanguage(grammar, import.meta.url);

    const second = await loadLanguage(grammar, import.meta.url);

    expect(second).toBe(first);
  });
});
