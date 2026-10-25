import type { PositionIndex, Span } from "./types.ts";

export const createPositionIndex = (source: string): PositionIndex => {
  const lineStarts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "\n") {
      lineStarts.push(i + 1);
    }
  }
  const lineStartAt = (line: number): number => {
    const start = lineStarts[line];
    // 渡される行は二分探索の探索範囲内か探索結果の行のため、`lineStarts`の範囲内
    if (start === undefined) {
      throw new Error("A line outside the source was referenced.");
    }

    return start;
  };
  const lineIndexOf = (index: number): number => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (lineStartAt(mid) <= index) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return low;
  };
  const lineStartOf = (index: number): number => lineStartAt(
    lineIndexOf(index),
  );
  const createSpan = (start: number, end: number): Span => ({
    raw: source.slice(start, end),
    range: [start, end],
    loc: {
      start: {
        line: lineIndexOf(start) + 1,
        column: start - lineStartOf(start),
      },
      end: { line: lineIndexOf(end) + 1, column: end - lineStartOf(end) },
    },
  });

  return { lineIndexOf, lineStartOf, createSpan };
};
