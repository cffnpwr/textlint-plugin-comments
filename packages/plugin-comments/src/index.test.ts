import { describe, expect, it, mock } from "bun:test";
import * as fs from "node:fs";

import type { TxtDocumentNode } from "@textlint/ast-node-types";
import type { TextlintFixableRuleModule, TextlintMessage, TextlintMessageFixCommand, TextlintRuleReporter, TextlintRuleSeverityLevel } from "@textlint/types";

import sentencePerLine from "@cffnpwr/textlint-rule-sentence-per-line";
import { TextlintKernel } from "@textlint/kernel";

import { createCommentDocument } from "./document/comments.ts";

import plugin from "./index.ts";

// `@textlint/types`の`TextlintRuleSeverityLevel`での`error`の値
const errorSeverity: TextlintRuleSeverityLevel = 2;

const kernel = new TextlintKernel();
const plugins = [{ pluginId: "comments", plugin }];

const dashMessage = "ダッシュがあります。";
const sentenceBreakMessage = "1行に複数の文があります。";
const lineJoinMessage = "文の途中で改行しています。";

type TextAfter = { after: string; text: string; };

type FixAt = { after: string; replaced: string; text: string; };

type MessagePosition = { line: number; column: number; };

// ビルド成果物の`wasm/`の有無に結果が左右されないよう、常に`devDependencies`のtree-sitterのgrammarを読込
await mock.module("node:fs", () => ({ ...fs, existsSync: () => false }));

const rangeAfter = (source: string, { after, text }: TextAfter): [number, number] => {
  const found = source.indexOf(after + text);
  if (found === -1) {
    throw new Error(`Expected text was not found in the source: ${after}${text}`);
  }
  const start = found + after.length;
  return [start, start + text.length];
};

const fixAt = (source: string, { after, replaced, text }: FixAt): TextlintMessageFixCommand => ({ range: rangeAfter(source, { after, text: replaced }), text });

// textlintが報告するメッセージの桁は1始まり
const messagePositionAt = (source: string, index: number): MessagePosition => {
  const before = source.slice(0, index);
  return { line: before.split("\n").length, column: index - before.lastIndexOf("\n") };
};

const buildReportedMessage = ({ source, ruleId, message, range, fix }: { source: string; ruleId: string; message: string; range: [number, number]; fix?: TextlintMessageFixCommand; }): TextlintMessage => {
  const start = messagePositionAt(source, range[0]);
  return {
    type: "lint",
    ruleId,
    message,
    index: range[0],
    line: start.line,
    column: start.column,
    range,
    loc: { start, end: messagePositionAt(source, range[1]) },
    severity: errorSeverity,
    ...(fix === undefined ? {} : { fix }),
  };
};

// 外部のルールの文言を検証しないよう、報告とfixだけを返すテスト内のルール
const dashRule: TextlintRuleReporter = (context) => ({
  [context.Syntax.Str](node) {
    for (const { index, 0: dash } of context.getSource(node).matchAll(/—+/g)) {
      context.report(node, new context.RuleError(dashMessage, { padding: context.locator.range([index, index + dash.length]) }));
    }
  },
});

// textlintの`fixText`の適用対象は、`linter`と`fixer`を持つルールのfixに限定
const toFixableRule = (reporter: TextlintRuleReporter): TextlintFixableRuleModule => ({ linter: reporter, fixer: reporter });

const reportSentenceBreak: TextlintRuleReporter = (context) => ({
  [context.Syntax.Str](node) {
    const text = context.getSource(node);
    const nextSentenceStart = text.indexOf("。") + "。".length;
    if (nextSentenceStart > 0 && nextSentenceStart < text.length) {
      context.report(node, new context.RuleError(sentenceBreakMessage, {
        padding: context.locator.range([nextSentenceStart, text.length]),
        // Markdown向けのルールと同じく、挿入する改行の後ろにインデントを付与
        fix: context.fixer.replaceTextRange([nextSentenceStart, nextSentenceStart], "\n    "),
      }));
    }
  },
});

const reportLineJoin: TextlintRuleReporter = (context) => ({
  [context.Syntax.Break](node) {
    const lineFeedRange = [0, "\n".length] as const;
    context.report(node, new context.RuleError(lineJoinMessage, { padding: context.locator.range(lineFeedRange), fix: context.fixer.replaceTextRange(lineFeedRange, "") }));
  },
});

describe("preProcess", () => {
  // 段落の構築は`createCommentDocument`のテストで検証するため、ここでは抽出範囲だけを検証
  const documentOf = (source: string, comments: readonly string[]): TxtDocumentNode => createCommentDocument(source, comments.map((text) => ({ start: source.indexOf(text), end: source.indexOf(text) + text.length }))).document;

  it.each([
    ...[".go", ".ts", ".mts", ".cts", ".tsx", ".js", ".mjs", ".cjs", ".jsx", ".rs", ".jsonc", ".json"].map((ext) => ({ ext, condition: "`//`コメントがある", source: "// 日本語のコメント\n", comments: ["// 日本語のコメント"] })),
    ...[".py", ".pyi", ".yaml", ".yml", ".toml", ".sh", ".bash"].map((ext) => ({ ext, condition: "`#`コメントがある", source: "# 日本語のコメント\n", comments: ["# 日本語のコメント"] })),
    { ext: ".rs", condition: "`//!`・`///`コメントがある", source: "//! 説明\n/// 関数\nfn a() {}\n", comments: ["//! 説明", "/// 関数"] },
    { ext: ".rs", condition: "ブロックコメントが入れ子である", source: "/* 外側 /* 内側 */ 続き */\nfn a() {}\n", comments: ["/* 外側 /* 内側 */ 続き */"] },
    { ext: ".ts", condition: "ソースが空である", source: "", comments: [] },
  ])("[positive] $ext で$conditionときコメントだけを段落にする", async ({ ext, source, comments }) => {
    const document = await new plugin.Processor().processor(ext).preProcess(source);

    expect(document).toEqual(documentOf(source, comments));
  });
});

describe("postProcess", () => {
  const messageWith = (fix?: TextlintMessageFixCommand): TextlintMessage => ({
    type: "lint",
    ruleId: "test",
    message: "テスト",
    index: 0,
    line: 1,
    column: 1,
    range: [0, 1],
    loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
    severity: errorSeverity,
    ...(fix === undefined ? {} : { fix }),
  });

  it.each([
    { filePath: "test.go", expected: "test.go" },
    { filePath: undefined, expected: "<comments>" },
  ])("[positive] filePathが$filePathのとき$expectedをfilePathとして返す", async ({ filePath, expected }) => {
    const { preProcess, postProcess } = new plugin.Processor().processor(".go");
    await preProcess("// コメント\n");

    const result = postProcess([messageWith()], filePath);

    expect(result).toEqual({ messages: [messageWith()], filePath: expected });
  });

  it.each([
    { condition: "fixが行間の改行を含めて消す", ext: ".go", source: "// 一行目\n// 二行目\n", fix: { after: "一行目", replaced: "\n", text: "" }, expected: { after: "一行目", replaced: "\n// ", text: "" } },
    { condition: "1行目の末尾に空白があり、fixが行間の改行だけを消す", ext: ".go", source: "// 一行目 \n// 二行目\n", fix: { after: "一行目 ", replaced: "\n", text: "" }, expected: { after: "一行目", replaced: " \n// ", text: "" } },
    { condition: "fixが行間に触れずに1行目の中を書き換える", ext: ".go", source: "// 一行目\n// 二行目\n", fix: { after: "// ", replaced: "一行", text: "正" }, expected: { after: "// ", replaced: "一行", text: "正" } },
    { condition: "fixが改行を挿入する", ext: ".go", source: "x := 1\n// 一文目です。二文目です。\n", fix: { after: "一文目です。", replaced: "", text: "\n    " }, expected: { after: "一文目です。", replaced: "", text: "\n// " } },
    { condition: "改行がCRLFの段落にfixが改行を挿入する", ext: ".py", source: "# 一。二。\r\nx = 1\n# 三。四。\n", fix: { after: "# 一。", replaced: "", text: "\n" }, expected: { after: "# 一。", replaced: "", text: "\r\n# " } },
    { condition: "改行がLFの段落にfixが改行を挿入する", ext: ".py", source: "# 一。二。\r\nx = 1\n# 三。四。\n", fix: { after: "# 三。", replaced: "", text: "\n" }, expected: { after: "# 三。", replaced: "", text: "\n# " } },
    { condition: "行末コメントでfixが改行を含まない", ext: ".go", source: "x := 1 // 誤記です。\n", fix: { after: "// ", replaced: "誤記", text: "正記" }, expected: { after: "// ", replaced: "誤記", text: "正記" } },
  ] satisfies { condition: string; ext: string; source: string; fix: FixAt; expected: FixAt; }[])("[positive] $conditionときコメントの構文を保つfixに変換する", async ({ ext, source, fix, expected }) => {
    const { preProcess, postProcess } = new plugin.Processor().processor(ext);
    await preProcess(source);

    const result = postProcess([messageWith(fixAt(source, fix))], "test");

    expect(result).toEqual({ messages: [messageWith(fixAt(source, expected))], filePath: "test" });
  });

  it.each([
    { condition: "fixが段落の外を書き換える", source: "// 一行目\n// 二行目\n", fix: { after: "", replaced: "// ", text: "" } },
    { condition: "fixが行間の記号だけを書き換える", source: "// 一行目\n// 二行目\n", fix: { after: "\n", replaced: "//", text: "" } },
    { condition: "改行がCRLFでfixが行間の\\nだけを消す", source: "// 一行目\r\n// 二行目\r\n", fix: { after: "一行目\r", replaced: "\n", text: "" } },
    { condition: "改行がCRLFでfixが行間の\\rだけを消す", source: "// 一行目\r\n// 二行目\r\n", fix: { after: "一行目", replaced: "\r", text: "" } },
    { condition: "行末コメントにfixが改行を挿入する", source: "x := 1 // 一文目です。二文目です。\n", fix: { after: "一文目です。", replaced: "", text: "\n" } },
  ] satisfies { condition: string; source: string; fix: FixAt; }[])("[negative] $conditionときfixを取り除き、エラーの報告は残す", async ({ source, fix }) => {
    const { preProcess, postProcess } = new plugin.Processor().processor(".go");
    await preProcess(source);

    const result = postProcess([messageWith(fixAt(source, fix))], "test");

    expect(result).toEqual({ messages: [messageWith()], filePath: "test" });
  });
});

describe("TextlintKernelに組み込んだプラグイン", () => {
  const sentenceBreakRule = toFixableRule(reportSentenceBreak);
  const lineJoinRule = toFixableRule(reportLineJoin);

  it("[positive] TextlintKernelで検査したときルールがコメント内の問題だけを元ファイルの位置で報告する", async () => {
    const source = "package main\n\nvar s = \"——\"\n\n// 補足——説明です。\nfunc main() {} // 行末—です。\n";

    const result = await kernel.lintText(source, { ext: ".go", filePath: "test.go", plugins, rules: [{ ruleId: "dash", rule: dashRule }] });

    expect(result).toEqual({
      filePath: "test.go",
      messages: [
        buildReportedMessage({ source, ruleId: "dash", message: dashMessage, range: rangeAfter(source, { after: "補足", text: "——" }) }),
        buildReportedMessage({ source, ruleId: "dash", message: dashMessage, range: rangeAfter(source, { after: "行末", text: "—" }) }),
      ],
    });
  });

  it("[positive] TextlintKernelで検査したとき行をまたぐ文を1つの文として扱う", async () => {
    const result = await kernel.lintText("// 一文目です。\n// 二文目は行を\n// またぎます。\n", { ext: ".go", filePath: "test.go", plugins, rules: [{ ruleId: "sentence-per-line", rule: sentencePerLine }] });

    expect(result).toEqual({ filePath: "test.go", messages: [] });
  });

  it.each([
    {
      ext: ".go",
      source: "func f() {\n\t// 一文目です。二文目です。\n}\n",
      rule: { ruleId: "sentence-break", rule: sentenceBreakRule },
      message: sentenceBreakMessage,
      reportedText: { after: "一文目です。", text: "二文目です。" },
      fix: { after: "一文目です。", replaced: "", text: "\n\t// " },
      output: "func f() {\n\t// 一文目です。\n\t// 二文目です。\n}\n",
      revertingFix: { after: "一文目です。", replaced: "\n\t// ", text: "" },
    },
    {
      ext: ".ts",
      source: "/**\n * 文の途中\n * で改行しています。\n */\n",
      rule: { ruleId: "line-join", rule: lineJoinRule },
      message: lineJoinMessage,
      reportedText: { after: "文の途中", text: "\n" },
      fix: { after: "文の途中", replaced: "\n * ", text: "" },
      output: "/**\n * 文の途中で改行しています。\n */\n",
      revertingFix: { after: "文の途中", replaced: "", text: "\n * " },
    },
  ])("[positive] TextlintKernelで$extのソースを修正したときfixを適用した結果を返す", async ({ ext, source, rule, message, reportedText, fix, output, revertingFix }) => {
    const result = await kernel.fixText(source, { ext, filePath: `test${ext}`, plugins, rules: [rule] });

    const range = rangeAfter(source, reportedText);
    expect(result).toEqual({
      filePath: `test${ext}`,
      output,
      messages: [buildReportedMessage({ source, ruleId: rule.ruleId, message, range, fix: fixAt(source, fix) })],
      // textlintは`applyingMessages`のfixに、修正後の出力を元に戻す範囲と文字列を格納
      applyingMessages: [buildReportedMessage({ source, ruleId: rule.ruleId, message, range, fix: fixAt(output, revertingFix) })],
      remainingMessages: [],
    });
  });
});
