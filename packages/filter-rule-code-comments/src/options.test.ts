import { describe, expect, it } from "bun:test";

import type { Options } from "./options.ts";

import { InvalidOptionsError, parseOptions } from "./options.ts";

describe("parseOptions", () => {
  it.each([
    { condition: "ignoredRulesを指定した", rawOptions: { ignoredRules: ["ja-no-mixed-period", "ja-technical-writing/ja-no-mixed-period"] }, expected: { ignoredRules: ["ja-no-mixed-period", "ja-technical-writing/ja-no-mixed-period"] } },
    { condition: "ignoredRulesを省略した", rawOptions: {}, expected: { ignoredRules: [] } },
  ] satisfies { condition: string; rawOptions: unknown; expected: Options; }[])("[positive] $conditionときオプションを返す", ({ rawOptions, expected }) => {
    const result = parseOptions(rawOptions);

    expect(result).toEqual(expected);
  });

  it.each([
    { condition: "ignoredRulesが配列でない", rawOptions: { ignoredRules: "ja-no-mixed-period" } },
    { condition: "ignoredRulesの要素が文字列でない", rawOptions: { ignoredRules: [1] } },
    { condition: "ignoredRulesに空文字列がある", rawOptions: { ignoredRules: [""] } },
    { condition: "未知のキーがある", rawOptions: { ignoreRules: ["ja-no-mixed-period"] } },
  ])("[negative] $conditionときInvalidOptionsErrorを投げる", ({ rawOptions }) => {
    expect(() => parseOptions(rawOptions)).toThrow(InvalidOptionsError);
  });
});
