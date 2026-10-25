import { describe, expect, it } from "bun:test";

import type { TextlintKernelOptions } from "@textlint/kernel";
import type { TextlintFilterRuleOptions, TextlintMessage } from "@textlint/types";

import commentsPlugin from "@cffnpwr/textlint-plugin-comments";
import { TextlintKernel } from "@textlint/kernel";
import markdownPlugin from "@textlint/textlint-plugin-markdown";
import jaNoMixedPeriod from "textlint-rule-ja-no-mixed-period";

import filterRule from "./index.ts";

const ignoredRuleId = "ja-no-mixed-period";
// プリセット内のルールのIDの書式で、ignoredRulesの値と別のIDになることも確認
const keptRuleId = "ja-technical-writing/ja-no-mixed-period";

const kernel = new TextlintKernel();

const codeComment = "句点のないコメント";
const codeSource = `// ${codeComment}\nconst a = 1;\n`;
const markdownText = "句点のない文";
const markdownSource = `${markdownText}\n`;

type ReportedRule = Pick<TextlintMessage, "ruleId" | "range">;

type LintCondition = {
  ext: string;
  filePath?: string;
  filterOptions: TextlintFilterRuleOptions | boolean;
};

// ja-no-mixed-periodは文末の1文字を報告
const lastCharacterRangeOf = (
  source: string,
  text: string,
): [number, number] => {
  const end = source.indexOf(text) + text.length;

  return [end - 1, end];
};

const lintOptionsOf = (
  { ext, filePath, filterOptions }: LintCondition,
): TextlintKernelOptions => ({
  ext,
  ...(filePath === undefined ? {} : { filePath }),
  plugins: [
    { pluginId: "@cffnpwr/comments", plugin: commentsPlugin },
    { pluginId: "markdown", plugin: markdownPlugin },
  ],
  rules: [
    { ruleId: ignoredRuleId, rule: jaNoMixedPeriod },
    // kernelは範囲と文言が同じ報告を1つにまとめるため、句点を変えて文言を区別
    { ruleId: keptRuleId, rule: jaNoMixedPeriod, options: { periodMark: "．" } },
  ],
  filterRules: [{ ruleId: "@cffnpwr/code-comments", rule: filterRule, options: filterOptions }],
});

// 報告の文言・fixは外部のルールが決めるため、報告したルールと範囲だけを比較
const reportedRulesOf = (
  messages: readonly TextlintMessage[],
): ReportedRule[] => messages.map(({ ruleId, range }) => ({ ruleId, range }));

describe("filterRule", () => {
  it("[positive] プラグインが扱う拡張子のファイルで、ignoredRulesに指定したルールの報告だけを取り消す", async () => {
    const options = lintOptionsOf({ ext: ".ts", filePath: "/project/src/index.ts", filterOptions: { ignoredRules: [ignoredRuleId] } });

    const result = await kernel.lintText(codeSource, options);

    expect(reportedRulesOf(result.messages)).toEqual([
      {
        ruleId: keptRuleId,
        range: lastCharacterRangeOf(codeSource, codeComment),
      },
    ]);
  });

  it.each([
    { condition: "プラグインが扱わない拡張子のファイルである", ext: ".md", filePath: "/project/README.md", source: markdownSource, reportedText: markdownText, filterOptions: { ignoredRules: [ignoredRuleId] } },
    { condition: "ファイルのパスが無い", ext: ".ts", filePath: undefined, source: codeSource, reportedText: codeComment, filterOptions: { ignoredRules: [ignoredRuleId] } },
    { condition: "オプションが無い", ext: ".ts", filePath: "/project/src/index.ts", source: codeSource, reportedText: codeComment, filterOptions: true },
  ])("[positive] $conditionとき報告を取り消さない", async ({ ext, filePath, source, reportedText, filterOptions }) => {
    const options = lintOptionsOf({ ext, filePath, filterOptions });
    const range = lastCharacterRangeOf(source, reportedText);

    const result = await kernel.lintText(source, options);

    expect(reportedRulesOf(result.messages)).toEqual([
      { ruleId: ignoredRuleId, range },
      { ruleId: keptRuleId, range },
    ]);
  });
});
