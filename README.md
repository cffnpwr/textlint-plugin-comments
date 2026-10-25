# @cffnpwr/textlint-plugin-comments

[![GitHub License](https://img.shields.io/github/license/cffnpwr/textlint-plugin-comments?style=flat)](./LICENSE)
[![npm Version](https://img.shields.io/npm/v/%40cffnpwr%2Ftextlint-plugin-comments?style=flat)](https://www.npmjs.com/package/@cffnpwr/textlint-plugin-comments)
[![JSR Version](https://jsr.io/badges/@cffnpwr/textlint-plugin-comments)](https://jsr.io/@cffnpwr/textlint-plugin-comments)

A textlint plugin that lints only the comments in source code and configuration files.

[日本語のREADMEはこちら](./README-ja.md)

Code and string literals outside comments are not linted.

```go
// This line comment is linted.
var s = "// This string literal is not linted."

func main() {} // Trailing comments are linted too.
```

## Supported Languages

| Language | Extensions |
| --- | --- |
| Go | `.go` |
| TypeScript | `.ts` `.mts` `.cts` `.tsx` |
| JavaScript | `.js` `.mjs` `.cjs` `.jsx` |
| Rust | `.rs` |
| Python | `.py` `.pyi` |
| JSONC | `.jsonc` `.json` |
| YAML | `.yaml` `.yml` |
| TOML | `.toml` |
| Shell script | `.sh` `.bash` |

Comments are identified with the [tree-sitter](https://tree-sitter.github.io/) grammar of each
language. `.json` files are parsed as JSONC, since files such as tsconfig.json are commonly written
with comments. Files without an extension, such as `.gitignore`, cannot be supported because of the
textlint CLI's behavior (it determines the extension with `path.extname`).

## How Comments Are Handled

Comment markers (`//` `///` `//!` `/*` `*/` `#`), and the leading `*` of each block comment line
together with the surrounding whitespace, are excluded from linting. Comments with an empty body
are not linted. Shebangs (`#!`) and Python docstrings are not linted.

Comments are grouped into paragraphs before linting.

- Line comments with the same marker that start their lines on consecutive lines form one paragraph.

  ```go
  // この関数は入力を
  // 検証します。
  ```

- Blank lines, code lines, and comment lines with an empty body separate paragraphs. In the example
  below, the comments on the first and third lines form separate paragraphs.

  ```go
  // この関数は入力を
  //
  // 検証します。
  ```

- A trailing comment written after code forms a paragraph by itself.

  ```go
  func main() {} // この関数は入力を検証します。
  ```

- A block comment forms one paragraph, and lines with an empty body inside it separate paragraphs.

  ```go
  /* この関数は入力を
   * 検証します。
   *
   * この文は別の段落です。
  */
  ```

- Rust's `//`, `///`, and `//!` are different kinds of comments and are split into separate
  paragraphs. In the example below, every line forms a separate paragraph.

  ```rust
  /// 設定を読み込み、
  //! 失敗したらエラーを返します。
  //  これは別の段落です。
  ```

## Autofix

Autofixes from rules (`textlint --fix`) are converted to keep the comment syntax intact before they
are applied.

- A fix that inserts a line break adds the continuation-line indentation and comment marker (` * `
  for JSDoc-style block comments) after the inserted line break.
- A fix that inserts a line break into a trailing comment is not applied; only the error is
  reported.
- A fix that joins lines also removes the indentation and comment marker of the next line.
- A fix that rewrites only part of a comment marker, or that reaches outside the comment body, is
  not applied; only the error is reported.

Line breaks follow the line ending used in the file.

## How to Install

### npm

```sh
npm install --save-dev @cffnpwr/textlint-plugin-comments
```

or

```sh
npx jsr add -D @cffnpwr/textlint-plugin-comments
```

### yarn

```sh
yarn add --dev @cffnpwr/textlint-plugin-comments
```

or

```sh
yarn dlx jsr add -D @cffnpwr/textlint-plugin-comments
```

### pnpm

```sh
pnpm add --save-dev @cffnpwr/textlint-plugin-comments
```

or

```sh
pnpm dlx jsr add -D @cffnpwr/textlint-plugin-comments
```

### Bun

```sh
bun add --dev @cffnpwr/textlint-plugin-comments
```

or

```sh
bunx jsr add -D @cffnpwr/textlint-plugin-comments
```

### Deno

```sh
deno add --dev npm:@cffnpwr/textlint-plugin-comments
```

or

```sh
deno add --dev jsr:@cffnpwr/textlint-plugin-comments
```

## How to Use

Add the plugin to `plugins` in `.textlintrc.json`, and configure the rules to apply in `rules`.

```json
{
  "plugins": {
    "@cffnpwr/comments": true
  },
  "rules": {
    "@cffnpwr/textlint-rule-no-dash": true
  }
}
```

```sh
npx textlint "src/**/*.ts"
```

## Options

This plugin has no options.

## License

[MIT](./LICENSE)
