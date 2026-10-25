import type { LineComment, ParagraphLines, PositionIndex, SourceRange } from "./types.ts";

import { skipSpacesAndTabs, toAlignedIndent, trimRange } from "./whitespace.ts";

type ParsedLineComment = {
  marker: string;
  body: SourceRange | undefined;
  line: number;
  isAtLineStart: boolean;
  continuationPrefix: string;
};

const toLineComment = (
  source: string,
  positions: PositionIndex,
  comment: LineComment,
): ParsedLineComment => {
  const lineStart = positions.lineStartOf(comment.start);
  const body = trimRange(
    source,
    comment.start + comment.marker.length,
    comment.end,
  );

  return {
    marker: comment.marker,
    body,
    line: positions.lineIndexOf(comment.start),
    isAtLineStart:
      skipSpacesAndTabs(source, lineStart, comment.start) === comment.start,
    continuationPrefix: toAlignedIndent(source, lineStart, comment.start)
      + source.slice(
        comment.start,
        body?.start ?? comment.start + comment.marker.length,
      ),
  };
};

export const buildLineCommentParagraphs = (
  source: string,
  positions: PositionIndex,
  comments: readonly LineComment[],
): ParagraphLines[] => {
  const paragraphs: ParagraphLines[] = [];
  let paragraph: ParagraphLines | undefined;
  let previous: ParsedLineComment | undefined;
  for (const comment of comments) {
    const current = toLineComment(source, positions, comment);
    const isContinuation = previous !== undefined
      && previous.isAtLineStart
      && current.isAtLineStart
      && previous.marker === current.marker
      && previous.line + 1 === current.line;
    if (!isContinuation || current.body === undefined) {
      paragraph = undefined;
    }
    if (current.body !== undefined) {
      if (paragraph === undefined) {
        paragraph = {
          lines: [current.body],
          continuationPrefix: current.continuationPrefix,
          isTrailing: !current.isAtLineStart,
        };
        paragraphs.push(paragraph);
      } else {
        paragraph.lines.push(current.body);
      }
    }
    previous = current;
  }

  return paragraphs;
};
