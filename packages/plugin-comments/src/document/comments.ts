import type { TxtBreakNode, TxtParagraphNode, TxtStrNode } from "@textlint/ast-node-types";

import { match } from "ts-pattern";

import type { CommentDocument, LineComment, Newline, ParagraphLines, PositionIndex, SourceRange } from "./types.ts";

import { buildBlockCommentParagraphs } from "./block-comments.ts";
import { buildLineCommentParagraphs } from "./line-comments.ts";
import { createPositionIndex } from "./position-index.ts";
import { newlineEndingAt } from "./whitespace.ts";

// `//!`・`///`（Rustのdocコメント）と`//`は別の種類として扱い、段落を分離
const lineCommentMarkerPattern = /^(?:\/\/(?:\/+|!)?|#+)/;
const blockCommentOpenerPattern = /^\/\*(?:\*+|!)?/;

type CommentSyntax = { kind: "line"; marker: string; } | { kind: "block"; opener: string; };

const classifyComment = (text: string): CommentSyntax => {
  const opener = blockCommentOpenerPattern.exec(text)?.[0];
  if (opener !== undefined) {
    return { kind: "block", opener };
  }
  const marker = lineCommentMarkerPattern.exec(text)?.[0];
  if (marker !== undefined) {
    return { kind: "line", marker };
  }
  // tree-sitterの各grammarの`comment`ノードは`//`・`/*`・`#`のいずれかで始まるため到達不能
  throw new Error(`Could not determine the comment marker: ${text}`);
};

const groupParagraphs = (source: string, positions: PositionIndex, comments: readonly SourceRange[]): ParagraphLines[] => {
  const blockParagraphs: ParagraphLines[] = [];
  const lineComments: LineComment[] = [];
  for (const comment of comments) {
    if (comment.start === 0 && source.startsWith("#!")) {
      continue;
    }
    match(classifyComment(source.slice(comment.start, comment.end)))
      .with({ kind: "block" }, ({ opener }) => {
        blockParagraphs.push(...buildBlockCommentParagraphs(source, positions, comment, opener));
      })
      .with({ kind: "line" }, ({ marker }) => {
        lineComments.push({ ...comment, marker });
      })
      .exhaustive();
  }
  // ブロックコメントを挟んだ行コメントどうしは行が隣接せず、別の段落
  return [...blockParagraphs, ...buildLineCommentParagraphs(source, positions, lineComments)].sort((a, b) => a.lines[0].start - b.lines[0].start);
};

const toParagraph = (source: string, positions: PositionIndex, [first, ...rest]: ParagraphLines["lines"]): TxtParagraphNode => {
  const toStr = (line: SourceRange): TxtStrNode => {
    const span = positions.createSpan(line.start, line.end);
    return { type: "Str", value: span.raw, ...span };
  };
  const children: (TxtStrNode | TxtBreakNode)[] = [toStr(first)];
  let previousEnd = first.end;
  for (const line of rest) {
    // 子ノードの間に隙間があると、`sentence-splitter`の`splitAST`が走査を終了
    children.push({ type: "Break", ...positions.createSpan(previousEnd, line.start) }, toStr(line));
    previousEnd = line.end;
  }
  return { type: "Paragraph", children, ...positions.createSpan(first.start, previousEnd) };
};

// 改行コードが混在するファイルでも、挿入する改行を段落の周囲の行の改行コードに統一
const detectParagraphNewline = (source: string, [first]: ParagraphLines["lines"]): Newline => {
  // 複数行の段落では、1行目の末尾の改行が行間（`Break`）の改行
  const following = source.indexOf("\n", first.end);
  if (following !== -1) {
    return newlineEndingAt(source, following);
  }
  const preceding = source.lastIndexOf("\n", first.start);
  return preceding === -1 ? "\n" : newlineEndingAt(source, preceding);
};

export const createCommentDocument = (source: string, comments: readonly SourceRange[]): CommentDocument => {
  const positions = createPositionIndex(source);
  const paragraphs = groupParagraphs(source, positions, comments).map(({ lines, continuationPrefix, isTrailing }) => ({
    node: toParagraph(source, positions, lines),
    continuationPrefix,
    isTrailing,
    newline: detectParagraphNewline(source, lines),
  }));
  return {
    document: { type: "Document", children: paragraphs.map(({ node }) => node), ...positions.createSpan(0, source.length) },
    paragraphs,
  };
};
