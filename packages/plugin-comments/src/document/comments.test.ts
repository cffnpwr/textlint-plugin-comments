import { describe, expect, it } from "bun:test";

import type { TxtBreakNode, TxtNodeLocation, TxtNodePosition, TxtNodeRange, TxtParagraphNode, TxtStrNode } from "@textlint/ast-node-types";

import { test as testTxtAst } from "@textlint/ast-tester";

import type { CommentDocument, CommentParagraph, SourceRange } from "./types.ts";

import { createCommentDocument } from "./comments.ts";

type ExpectedParagraph = Omit<CommentParagraph, "node"> & { lines: [string, ...string[]]; };

// 期待値の位置は実装と独立に、元のソースの行頭からの位置として算出
const positionAt = (source: string, index: number): TxtNodePosition => {
  const before = source.slice(0, index);
  return { line: before.split("\n").length, column: index - (before.lastIndexOf("\n") + 1) };
};

const spanOf = (source: string, start: number, end: number): { raw: string; range: TxtNodeRange; loc: TxtNodeLocation; } => ({
  raw: source.slice(start, end),
  range: [start, end],
  loc: { start: positionAt(source, start), end: positionAt(source, end) },
});

// 同じ文字列がソースの前方にもある場合に備え、前回見つけた位置の後ろから検索
const createSequentialFinder = (source: string): (text: string) => SourceRange => {
  let cursor = 0;
  return (text: string) => {
    const start = source.indexOf(text, cursor);
    if (start === -1) {
      throw new Error(`Expected text was not found in the source: ${text}`);
    }
    cursor = start + text.length;
    return { start, end: cursor };
  };
};

const buildExpectedDocument = (source: string, paragraphs: readonly ExpectedParagraph[]): CommentDocument => {
  const find = createSequentialFinder(source);
  const strOf = (text: string): TxtStrNode => {
    const { start, end } = find(text);
    return { type: "Str", value: text, ...spanOf(source, start, end) };
  };
  const commentParagraphs = paragraphs.map(({ lines: [firstText, ...restTexts], ...fields }) => {
    const first = strOf(firstText);
    const children: (TxtStrNode | TxtBreakNode)[] = [first];
    let previousEnd = first.range[1];
    for (const text of restTexts) {
      const str = strOf(text);
      children.push({ type: "Break", ...spanOf(source, previousEnd, str.range[0]) }, str);
      previousEnd = str.range[1];
    }
    const node: TxtParagraphNode = { type: "Paragraph", children, ...spanOf(source, first.range[0], previousEnd) };
    return { node, ...fields };
  });
  return { document: { type: "Document", children: commentParagraphs.map(({ node }) => node), ...spanOf(source, 0, source.length) }, paragraphs: commentParagraphs };
};

const buildExpectedParagraph = (lines: [string, ...string[]], continuationPrefix: string, { isTrailing = false, newline = "\n" }: Partial<Pick<CommentParagraph, "isTrailing" | "newline">> = {}): ExpectedParagraph => ({ lines, continuationPrefix, isTrailing, newline });

describe("createCommentDocument", () => {
  const cases = [
    { condition: "行コメントの間に空行・本文が空のコメント行・コード行がある", source: "// 一\n\n// 二\n//\n// 三\nx := 1\n// 四\n", comments: ["// 一", "// 二", "//", "// 三", "// 四"], paragraphs: [buildExpectedParagraph(["一"], "// "), buildExpectedParagraph(["二"], "// "), buildExpectedParagraph(["三"], "// "), buildExpectedParagraph(["四"], "// ")] },
    { condition: "コードの後ろに行末コメントがある", source: "x := 1 // 行末の一\n// 次の行\ny := 2 // 行末の二\nz := 3 // 行末の三\n", comments: ["// 行末の一", "// 次の行", "// 行末の二", "// 行末の三"], paragraphs: [buildExpectedParagraph(["行末の一"], "       // ", { isTrailing: true }), buildExpectedParagraph(["次の行"], "// "), buildExpectedParagraph(["行末の二"], "       // ", { isTrailing: true }), buildExpectedParagraph(["行末の三"], "       // ", { isTrailing: true })] },
    { condition: "改行がCRLFである", source: "# 一\r\n# 二\r\n", comments: ["# 一\r", "# 二\r"], paragraphs: [buildExpectedParagraph(["一", "二"], "# ", { newline: "\r\n" })] },
    { condition: "本文がサロゲートペアを含む", source: "const a = 1; // 𠮷野家の𩸽\n", comments: ["// 𠮷野家の𩸽"], paragraphs: [buildExpectedParagraph(["𠮷野家の𩸽"], `${" ".repeat("const a = 1; ".length)}// `, { isTrailing: true })] },
    { condition: "`//!`・`///`・`//`が続き、行コメントが末尾の改行を含む", source: "//! 説明\n//! 続き\n/// 関数\n// 通常\nfn a() {}\n", comments: ["//! 説明\n", "//! 続き\n", "/// 関数\n", "// 通常\n"], paragraphs: [buildExpectedParagraph(["説明", "続き"], "//! "), buildExpectedParagraph(["関数"], "/// "), buildExpectedParagraph(["通常"], "// ")] },
    { condition: "行コメントの前のインデントがタブである", source: "func f() {\n\t// 一\n}\n", comments: ["// 一"], paragraphs: [buildExpectedParagraph(["一"], "\t// ")] },
    { condition: "ファイルの先頭がシバンである", source: "#!/bin/bash\n# 説明\n", comments: ["#!/bin/bash", "# 説明"], paragraphs: [buildExpectedParagraph(["説明"], "# ")] },
    { condition: "ブロックコメントの各行頭に`*`があり、本文が空の行を含む", source: "/**\n * 概要の\n * 説明。\n *\n * @param x 引数\n */\n", comments: ["/**\n * 概要の\n * 説明。\n *\n * @param x 引数\n */"], paragraphs: [buildExpectedParagraph(["概要の", "説明。"], " * "), buildExpectedParagraph(["@param x 引数"], " * ")] },
    { condition: "ブロックコメントの継続行が`*`の後ろに字下げしている", source: "/* 概要\n *   詳細\n */\n", comments: ["/* 概要\n *   詳細\n */"], paragraphs: [buildExpectedParagraph(["概要", "詳細"], " *   ")] },
    { condition: "ブロックコメントの閉じ記号の前に`*`が続く", source: "/* 強調 **/\n", comments: ["/* 強調 **/"], paragraphs: [buildExpectedParagraph(["強調"], "   ")] },
    { condition: "ブロックコメントの1行目の本文が`*`で始まる", source: "/* *注* */\n", comments: ["/* *注* */"], paragraphs: [buildExpectedParagraph(["*注*"], "   ")] },
    { condition: "ブロックコメントの2行目以降の行頭に`*`が無い", source: "/* 一行目\n   二行目 */\n", comments: ["/* 一行目\n   二行目 */"], paragraphs: [buildExpectedParagraph(["一行目", "二行目"], "   ")] },
    { condition: "`/***`で始まる1行のブロックコメントがある", source: "/*** 強調 */\n", comments: ["/*** 強調 */"], paragraphs: [buildExpectedParagraph(["強調"], "     ")] },
    { condition: "行コメントとブロックコメントが交互にある", source: "// 一\n/* 二 */\n// 三\n", comments: ["// 一", "/* 二 */", "// 三"], paragraphs: [buildExpectedParagraph(["一"], "// "), buildExpectedParagraph(["二"], "   "), buildExpectedParagraph(["三"], "// ")] },
    { condition: "1行のブロックコメントと行末のブロックコメントがある", source: "/** 一行 */\nconst a = 1; /* 行末 */\n", comments: ["/** 一行 */", "/* 行末 */"], paragraphs: [buildExpectedParagraph(["一行"], " * "), buildExpectedParagraph(["行末"], " ".repeat("const a = 1; /* ".length))] },
    { condition: "本文が空のブロックコメントだけがある", source: "/**/\n/* */\n/**\n *\n */\n", comments: ["/**/", "/* */", "/**\n *\n */"], paragraphs: [] },
    { condition: "ブロックコメントが入れ子である", source: "/* 外側 /* 内側 */ 続き */\n", comments: ["/* 外側 /* 内側 */ 続き */"], paragraphs: [buildExpectedParagraph(["外側 /* 内側 */ 続き"], "   ")] },
    { condition: "ブロックコメントが閉じていない", source: "x;\n/* 閉じていない\n", comments: ["/* 閉じていない"], paragraphs: [buildExpectedParagraph(["閉じていない"], "   ")] },
    { condition: "ファイル末尾のコメントの後ろに改行が無い", source: "x;\r\n/* 末尾 */", comments: ["/* 末尾 */"], paragraphs: [buildExpectedParagraph(["末尾"], "   ", { newline: "\r\n" })] },
    { condition: "ファイルに改行が無い", source: "/* 一 */", comments: ["/* 一 */"], paragraphs: [buildExpectedParagraph(["一"], "   ")] },
    { condition: "段落ごとに改行コードが異なる", source: "// 一\r\n// 二\n\n// 三\n", comments: ["// 一\r", "// 二", "// 三"], paragraphs: [buildExpectedParagraph(["一", "二"], "// ", { newline: "\r\n" }), buildExpectedParagraph(["三"], "// ")] },
  ];

  it("[positive] 行頭の行コメントが隣接する行に続くとき1つの段落にまとめ、行間をBreakにする", () => {
    const source = "package main\n\n  // 一行目の\n  // 二行目。\nfunc main() {}\n";
    const find = createSequentialFinder(source);
    const comments = [find("// 一行目の"), find("// 二行目。")];

    const result = createCommentDocument(source, comments);

    const findBody = createSequentialFinder(source);
    const first = findBody("一行目の");
    const second = findBody("二行目。");
    const paragraph: TxtParagraphNode = {
      type: "Paragraph",
      ...spanOf(source, first.start, second.end),
      children: [
        { type: "Str", value: "一行目の", ...spanOf(source, first.start, first.end) },
        { type: "Break", ...spanOf(source, first.end, second.start) },
        { type: "Str", value: "二行目。", ...spanOf(source, second.start, second.end) },
      ],
    };
    expect(result).toEqual({
      document: { type: "Document", ...spanOf(source, 0, source.length), children: [paragraph] },
      paragraphs: [{ node: paragraph, continuationPrefix: "  // ", isTrailing: false, newline: "\n" }],
    });
  });

  it.each(cases)("[positive] $conditionとき本文行ごとの段落と継続行の書き方を返す", ({ source, comments, paragraphs }) => {
    const result = createCommentDocument(source, comments.map(createSequentialFinder(source)));

    expect(result).toEqual(buildExpectedDocument(source, paragraphs));
  });

  it.each(cases)("[positive] $conditionときDocumentがTxtASTとして妥当である", ({ source, comments }) => {
    const { document } = createCommentDocument(source, comments.map(createSequentialFinder(source)));

    const inspect = (): void => testTxtAst(document as unknown as Record<string, unknown>);

    expect(inspect).not.toThrow();
  });
});
