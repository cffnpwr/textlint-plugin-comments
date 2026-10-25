import type { Newline, SourceRange } from "./types.ts";

const isSpaceOrTab = (char: string | undefined): boolean => char === " " || char === "\t";

export const skipSpacesAndTabs = (
  source: string,
  index: number,
  end: number,
): number => {
  let i = index;
  while (i < end && isSpaceOrTab(source[i])) {
    i += 1;
  }

  return i;
};

// 行末の空白に加え、CRLFの`\r`と、Rustの`line_comment`が末尾に含む`\n`も除去
export const trimRange = (
  source: string,
  start: number,
  end: number,
): SourceRange | undefined => {
  const trimmedStart = skipSpacesAndTabs(source, start, end);
  let trimmedEnd = end;
  while (
    trimmedEnd > trimmedStart
    && (isSpaceOrTab(source[trimmedEnd - 1])
      || source[trimmedEnd - 1] === "\r"
      || source[trimmedEnd - 1] === "\n")
  ) {
    trimmedEnd -= 1;
  }

  return trimmedEnd > trimmedStart
    ? { start: trimmedStart, end: trimmedEnd }
    : undefined;
};

// タブの表示幅は環境ごとに異なるため、タブ以外の文字だけを空白に置換して桁揃え
export const toAlignedIndent = (source: string, start: number, end: number): string => source.slice(start, end).replaceAll(/[^\t]/g, " ");

export const newlineEndingAt = (source: string, lineFeedIndex: number): Newline => (source[lineFeedIndex - 1] === "\r" ? "\r\n" : "\n");
