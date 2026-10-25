import type { TxtDocumentNode } from "@textlint/ast-node-types";
import type { TextlintMessage, TextlintMessageFixCommand, TextlintPluginCreator, TextlintPluginPostProcessResult } from "@textlint/types";

import { Parser } from "web-tree-sitter";

import type { CommentDocument, CommentParagraph, SourceRange } from "./document/types.ts";
import type { Grammar } from "./language/grammars.ts";

import { createCommentDocument } from "./document/comments.ts";
import { newlineEndingAt } from "./document/whitespace.ts";
import { grammarOf, supportedExtensions } from "./language/grammars.ts";
import { loadLanguage } from "./language/wasm.ts";

// Rustのtree-sitterのgrammarだけが行コメントとブロックコメントを別のノード型として解析
const commentNodeTypes = ["comment", "line_comment", "block_comment"];

// ルールが改行の後ろに付けるインデントはMarkdown向けのため、コメントの継続行の書き方に置換
const insertedNewlinePattern = /\r?\n[ \t]*/g;

type ProcessorHandlers = {
  preProcess: (text: string) => Promise<TxtDocumentNode>;
  postProcess: (
    messages: TextlintMessage[],
    filePath?: string,
  ) => TextlintPluginPostProcessResult;
};

const parseComments = async (
  grammar: Grammar,
  text: string,
): Promise<SourceRange[]> => {
  // `src`と`dist`のどちらでも、このモジュールから見た`../wasm/`が同梱した`.wasm`の位置
  const language = await loadLanguage(grammar, import.meta.url);
  // `Parser`の生成は`Parser.init()`の完了後が必須で、`loadLanguage`が初期化を待機
  const parser = new Parser();
  try {
    parser.setLanguage(language);
    const tree = parser.parse(text);
    // `parse`が`null`を返すのは言語が未設定か解析を中断した場合だけのため到達不能
    if (tree === null) {
      throw new Error("Parsing the source did not produce a syntax tree.");
    }
    try {
      return tree.rootNode
        .descendantsOfType(commentNodeTypes)
        .map((node) => ({ start: node.startIndex, end: node.endIndex }));
    } finally {
      tree.delete();
    }
  } finally {
    parser.delete();
  }
};

const convertFix = (
  fix: TextlintMessageFixCommand,
  paragraphs: readonly CommentParagraph[],
): TextlintMessageFixCommand | undefined => {
  let [start, end] = fix.range;
  const paragraph = paragraphs.find(
    ({ node }) => node.range[0] <= start && end <= node.range[1],
  );
  if (paragraph === undefined) {
    return undefined;
  }
  // 行末コメントの次の行に記号を補っても、別の段落の行コメントになるため変換不能
  if (paragraph.isTrailing && fix.text.includes("\n")) {
    return undefined;
  }
  for (const child of paragraph.node.children) {
    if (child.type !== "Break" || !(start < child.range[1] && child.range[0] < end)) {
      continue;
    }
    // 段落内の隣接行の間の改行は1つだけのため、`Break`の最初の`\n`がその改行
    const lineFeedIndex = child.raw.indexOf("\n");
    const newlineEnd = child.range[0] + lineFeedIndex + 1;
    const newlineStart = newlineEnd
      - newlineEndingAt(child.raw, lineFeedIndex).length;
    // 記号・インデントの一部だけを書き換えるfixは、適用後のコメントの構文が不正になる可能性あり
    if (start > newlineStart || end < newlineEnd) {
      return undefined;
    }
    // 改行を含めて消すfixを行の連結とみなし、次の行の記号までを置換範囲に追加
    start = Math.min(start, child.range[0]);
    end = Math.max(end, child.range[1]);
  }

  return {
    range: [start, end],
    text: fix.text.replaceAll(insertedNewlinePattern, `${paragraph.newline}${paragraph.continuationPrefix}`),
  };
};

const convertFixes = (
  messages: readonly TextlintMessage[],
  { paragraphs }: CommentDocument,
): TextlintMessage[] => messages.map((message) => {
  if (message.fix === undefined) {
    return message;
  }
  const fix = convertFix(message.fix, paragraphs);
  if (fix === undefined) {
    const { fix: _removed, ...rest } = message;

    return rest;
  }

  return { ...message, fix };
});

class CommentsProcessor {
  // lintでは`postProcess`を`processor(ext)`の別の呼び出しから得るため、インスタンスに保持
  #parsed: CommentDocument | undefined;

  availableExtensions(): string[] {
    return supportedExtensions;
  }

  processor(ext: string): ProcessorHandlers {
    const grammar = grammarOf(ext);

    return {
      preProcess: async (text: string) => {
        // `--fix`ではルールごとに`postProcess`の直前の`preProcess`で再解析
        this.#parsed = createCommentDocument(
          text,
          await parseComments(grammar, text),
        );

        return this.#parsed.document;
      },
      postProcess: (messages: TextlintMessage[], filePath?: string) => {
        // textlintは常に`preProcess`の後に`postProcess`を呼ぶため、契約に反する呼び出しでのみ到達
        if (this.#parsed === undefined) {
          throw new Error("postProcess was called before preProcess.");
        }

        return { messages: convertFixes(messages, this.#parsed), filePath: filePath ?? "<comments>" };
      },
    };
  }
}

const plugin: TextlintPluginCreator = { Processor: CommentsProcessor };

export default plugin;
