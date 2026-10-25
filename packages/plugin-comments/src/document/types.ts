import type { TxtDocumentNode, TxtNodeLocation, TxtNodeRange, TxtParagraphNode } from "@textlint/ast-node-types";

// UTF-16コードユニット単位で数える、`source`上の半開区間`[start, end)`
export type SourceRange = { start: number; end: number; };

export type LineComment = SourceRange & { marker: string; };

export type Newline = "\r\n" | "\n";

export type CommentParagraph = {
  node: TxtParagraphNode;
  // 段落内に改行を挿入するとき、次の行の先頭へ補うインデント・コメント記号・空白
  continuationPrefix: string;
  isTrailing: boolean;
  newline: Newline;
};

export type ParagraphLines = Omit<CommentParagraph, "node" | "newline"> & { lines: [SourceRange, ...SourceRange[]]; };

export type CommentDocument = {
  document: TxtDocumentNode;
  paragraphs: CommentParagraph[];
};

export type Span = { raw: string; range: TxtNodeRange; loc: TxtNodeLocation; };

export type PositionIndex = {
  lineIndexOf: (index: number) => number;
  lineStartOf: (index: number) => number;
  createSpan: (start: number, end: number) => Span;
};
