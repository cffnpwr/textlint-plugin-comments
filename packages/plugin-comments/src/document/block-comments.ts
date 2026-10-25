import type { ParagraphLines, PositionIndex, SourceRange } from "./types.ts";

import { skipSpacesAndTabs, toAlignedIndent, trimRange } from "./whitespace.ts";

const blockCommentCloserPattern = /\*+\/$/;

// JSDocの解析対象は`/**`で始まるコメントだけで、`/***`以上で始まるコメントは対象外
const jsdocOpener = "/**";

type BlockCommentLine = {
  lineStart: number;
  body: SourceRange | undefined;
};

const splitBlockBody = (
  source: string,
  bodyStart: number,
  bodyEnd: number,
): BlockCommentLine[] => {
  const lines: BlockCommentLine[] = [];
  let lineStart = bodyStart;
  while (lineStart <= bodyEnd) {
    const lineFeedIndex = source.indexOf("\n", lineStart);
    const lineEnd = lineFeedIndex === -1 || lineFeedIndex >= bodyEnd
      ? bodyEnd
      : lineFeedIndex;
    let textStart = lineStart;
    // 2行目以降の行頭の`*`はJSDoc等の装飾のため、本文から除外
    if (lineStart !== bodyStart) {
      textStart = skipSpacesAndTabs(source, lineStart, lineEnd);
      if (textStart < lineEnd && source[textStart] === "*") {
        textStart += 1;
      }
    }
    lines.push({ lineStart, body: trimRange(source, textStart, lineEnd) });
    lineStart = lineEnd + 1;
  }

  return lines;
};

const determineBlockContinuationPrefix = (
  source: string,
  positions: PositionIndex,
  comment: SourceRange,
  opener: string,
  bodyEnd: number,
  lines: readonly BlockCommentLine[],
): string => {
  // 既存の継続行の書き方に準拠
  for (const { lineStart, body } of lines.slice(1)) {
    if (body !== undefined) {
      return source.slice(lineStart, body.start);
    }
  }
  const firstTextStart = skipSpacesAndTabs(
    source,
    comment.start + opener.length,
    bodyEnd,
  );

  // 継続行が無いJSDocコメントには、JSDocの慣習の` * `を補完
  return toAlignedIndent(
    source,
    positions.lineStartOf(comment.start),
    comment.start,
  )
    + (opener === jsdocOpener
      ? " * "
      : " ".repeat(firstTextStart - comment.start));
};

export const buildBlockCommentParagraphs = (
  source: string,
  positions: PositionIndex,
  comment: SourceRange,
  opener: string,
): ParagraphLines[] => {
  const bodyStart = comment.start + opener.length;
  // Rustのtree-sitterのgrammarは閉じていないブロックコメントも`comment`ノードとして解析
  const closerLength = blockCommentCloserPattern
    .exec(source.slice(comment.start, comment.end))?.[0].length ?? 0;
  const bodyEnd = comment.end - closerLength;
  const lines = splitBlockBody(source, bodyStart, bodyEnd);
  const continuationPrefix = determineBlockContinuationPrefix(
    source,
    positions,
    comment,
    opener,
    bodyEnd,
    lines,
  );
  const paragraphs: ParagraphLines[] = [];
  let paragraph: ParagraphLines | undefined;
  for (const { body } of lines) {
    if (body === undefined) {
      paragraph = undefined;
    } else if (paragraph === undefined) {
      paragraph = { lines: [body], continuationPrefix, isTrailing: false };
      paragraphs.push(paragraph);
    } else {
      paragraph.lines.push(body);
    }
  }

  return paragraphs;
};
