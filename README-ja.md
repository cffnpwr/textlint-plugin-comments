# @cffnpwr/textlint-plugin-comments

[![GitHub License](https://img.shields.io/github/license/cffnpwr/textlint-plugin-comments?style=flat)](./LICENSE)
[![npm Version](https://img.shields.io/npm/v/%40cffnpwr%2Ftextlint-plugin-comments?style=flat)](https://www.npmjs.com/package/@cffnpwr/textlint-plugin-comments)
[![JSR Version](https://jsr.io/badges/@cffnpwr/textlint-plugin-comments)](https://jsr.io/@cffnpwr/textlint-plugin-comments)

ソースコード・設定ファイルのコメント部分だけをtextlintの検査対象にするプラグインです。

[README.md for English is available here](./README.md).

コメント以外のコード・文字列リテラルは検査しません。

```go
// この行コメントは検査対象です。
var s = "// この文字列リテラルは検査対象外です。"

func main() {} // 行末のコメントも検査対象です。
```

## 対応する言語

| 言語 | 拡張子 |
| --- | --- |
| Go | `.go` |
| TypeScript | `.ts` `.mts` `.cts` `.tsx` |
| JavaScript | `.js` `.mjs` `.cjs` `.jsx` |
| Rust | `.rs` |
| Python | `.py` `.pyi` |
| JSONC | `.jsonc` `.json` |
| YAML | `.yaml` `.yml` |
| TOML | `.toml` |
| シェルスクリプト | `.sh` `.bash` |

コメントの判定には[tree-sitter](https://tree-sitter.github.io/)の各言語のgrammarを使います。
`.json`はtsconfig.jsonのようにコメントを含めて書く慣行があるため、JSONCとして解析します。
`.gitignore`のような拡張子の無いファイルは、textlint CLIの仕様（拡張子の判定に`path.extname`を使う）により対象にできません。

## コメントの扱い

コメント記号（`//` `///` `//!` `/*` `*/` `#`）と、ブロックコメント各行頭の`*`とその前後の空白は検査対象から外します。
本文が空のコメントは検査しません。
シバン（`#!`）とPythonのdocstringは検査しません。

コメントは段落にまとめて検査します。

- 同じ記号の行コメントが行頭で隣接する行に続く場合は、1つの段落として扱います

  ```go
  // この関数は入力を
  // 検証します。
  ```

- 空行・コードの行・本文が空のコメント行で段落を区切ります。以下の例では、1行目と3行目のコメントは別の段落として扱われます

  ```go
  // この関数は入力を
  //
  // 検証します。
  ```

- コードの後ろに書いた行末のコメントは、それだけで1つの段落として扱います

  ```go
  func main() {} // この関数は入力を検証します。
  ```

- ブロックコメントは1つの段落として扱い、本文が空の行で段落を区切ります

  ```go
  /* この関数は入力を
   * 検証します。
   *
   * この文は別の段落です。
  */
  ```

- Rustの`//`・`///`・`//!`は種類の異なるコメントとして、別の段落に分けます。以下の例ではすべての行が別の段落として扱われます

  ```rust
  /// 設定を読み込み、
  //! 失敗したらエラーを返します。
  //  これは別の段落です。
  ```

## 自動修正

ルールの自動修正（`textlint --fix`）は、コメントの構文を保つ形に変換してから適用します。

- 改行を挿入する修正は、挿入した改行の後ろに継続行のインデントとコメント記号（JSDoc形式のブロックコメントでは` * `）を補います
- 行末のコメントに改行を挿入する修正は適用せず、エラーの報告だけを残します
- 行を連結する修正は、次の行のインデントとコメント記号もあわせて取り除きます
- コメント記号の一部だけを書き換える修正と、コメントの本文の外に及ぶ修正は適用せず、エラーの報告だけを残します

挿入する改行の改行コードは、段落の1行目の末尾の改行コードに合わせます。
その行がファイル末尾の行で後ろに改行が無い場合は直前の行の改行コードに、ファイルに改行が1つも無い場合はLFに合わせます。

## インストール

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

JSRから導入した場合は、言語の構文定義ファイル（`.wasm`）を実行時にjsr.ioから取得します。
そのため、textlintの実行にはjsr.ioへのネットワークアクセスの許可（`--allow-net=jsr.io`）が必要です。

## 使い方

`.textlintrc.json`の`plugins`に追加し、検査に使うルールを`rules`に設定します。

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

## オプション

オプションはありません。

## ライセンス

[MIT](./LICENSE)
