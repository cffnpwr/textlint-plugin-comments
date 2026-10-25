import { extname } from "node:path";

import type { TextlintFilterRuleReporter, TextlintFilterRuleReportHandler } from "@textlint/types";

import commentsPlugin from "@cffnpwr/textlint-plugin-comments";

import { parseOptions } from "./options.ts";

const commentExtensions = new commentsPlugin.Processor().availableExtensions();

// textlintのkernelがプラグインを選ぶ方法と同じく、拡張子を後方一致で照合
const isCommentFile = (filePath: string): boolean => {
  const extension = extname(filePath);

  return commentExtensions.some(
    (commentExtension) => extension.endsWith(commentExtension),
  );
};

const filterRule: TextlintFilterRuleReporter = (
  context,
  rawOptions,
): TextlintFilterRuleReportHandler => {
  const { ignoredRules } = parseOptions(rawOptions);
  const filePath = context.getFilePath();
  // 標準入力のようにパスが無い入力は、どのプラグインで解析したか判別不能
  if (filePath === undefined || !isCommentFile(filePath)) {
    return {};
  }

  return {
    [context.Syntax.Document](node) {
      for (const ruleId of ignoredRules) {
        context.shouldIgnore(node.range, { ruleId });
      }
    },
  };
};

export default filterRule;
