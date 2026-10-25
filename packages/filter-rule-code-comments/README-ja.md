# @cffnpwr/textlint-filter-rule-code-comments

[![GitHub License](https://img.shields.io/github/license/cffnpwr/textlint-plugin-comments?style=flat)](./LICENSE)
[![npm Version](https://img.shields.io/npm/v/%40cffnpwr%2Ftextlint-filter-rule-code-comments?style=flat)](https://www.npmjs.com/package/@cffnpwr/textlint-filter-rule-code-comments)
[![JSR Version](https://jsr.io/badges/@cffnpwr/textlint-filter-rule-code-comments)](https://jsr.io/@cffnpwr/textlint-filter-rule-code-comments)

ソースコードのコメントにだけ、指定したtextlintルールの報告を適用しないフィルタールールです。

[README.md for English is available here](./README.md).

1つの設定ファイルで、文書とコードのコメントに異なる書き方の規則を適用できます。
例えば、文書では文末の句点を必須にする`ja-no-mixed-period`を使い、コードのコメントでは体言止め・句点なしで書くという運用ができます。

```ts
// 設定ファイルの読み込み
const config = loadConfig();
```

上の例のコメントは句点で終わっていませんが、`ja-no-mixed-period`の報告を取り消すため、エラーになりません。
同じ設定でも、Markdownの文書で句点の無い文はエラーになります。

## 対象のファイル

[@cffnpwr/textlint-plugin-comments](https://github.com/cffnpwr/textlint-plugin-comments/blob/main/packages/plugin-comments/README-ja.md#対応する言語)が扱う拡張子のファイルだけが対象です。
拡張子の一覧はプラグインから取得します。
拡張子の照合は、textlintがファイルを解析するプラグインを選ぶときと同じく、ファイルパスの拡張子（`path.extname`）の後方一致で行います。

ファイルのパスを取得できない場合は、報告を取り消しません。
textlintをAPIから`filePath`を指定せずに使う場合が該当します。
textlint CLIで標準入力を検査する場合は`--stdin-filename`の指定が必須のため、指定したファイル名の拡張子で判定します。

## インストール

このフィルタールールは、コメントの抽出に[@cffnpwr/textlint-plugin-comments](https://github.com/cffnpwr/textlint-plugin-comments/blob/main/packages/plugin-comments/README-ja.md)を使います。
プラグインは依存として一緒にインストールされます。

### npm

```sh
npm install --save-dev @cffnpwr/textlint-filter-rule-code-comments
```

or

```sh
npx jsr add -D @cffnpwr/textlint-filter-rule-code-comments
```

### yarn

```sh
yarn add --dev @cffnpwr/textlint-filter-rule-code-comments
```

or

```sh
yarn dlx jsr add -D @cffnpwr/textlint-filter-rule-code-comments
```

### pnpm

```sh
pnpm add --save-dev @cffnpwr/textlint-filter-rule-code-comments
```

or

```sh
pnpm dlx jsr add -D @cffnpwr/textlint-filter-rule-code-comments
```

### Bun

```sh
bun add --dev @cffnpwr/textlint-filter-rule-code-comments
```

or

```sh
bunx jsr add -D @cffnpwr/textlint-filter-rule-code-comments
```

### Deno

```sh
deno add --dev npm:@cffnpwr/textlint-filter-rule-code-comments
```

or

```sh
deno add --dev jsr:@cffnpwr/textlint-filter-rule-code-comments
```

## 使い方

`.textlintrc.json`の`plugins`にプラグインを、`filters`にこのフィルタールールを追加します。
`filters`のキーは`@cffnpwr/code-comments`です。
パッケージ名の`@cffnpwr/textlint-filter-rule-code-comments`もキーに使えます。

```json
{
  "plugins": {
    "@cffnpwr/comments": true
  },
  "filters": {
    "@cffnpwr/code-comments": {
      "ignoredRules": ["ja-no-mixed-period"]
    }
  },
  "rules": {
    "ja-no-mixed-period": true
  }
}
```

```sh
npx textlint "src/**/*.ts" "docs/**/*.md"
```

## オプション

```ts
interface Options {
  ignoredRules?: string[];
}
```

| オプション | デフォルト | 説明 |
| --- | --- | --- |
| `ignoredRules` | `[]` | コードのコメントで報告を取り消すルールのIDのリスト |

`ignoredRules`を指定しない場合は、どのルールの報告も取り消しません。
`"*"`を指定すると、すべてのルールの報告を取り消します。
不明なオプションのキーを指定した場合、`ignoredRules`に配列でない値を指定した場合、`ignoredRules`の要素に空文字列を指定した場合はエラーになります。

### ルールのID

ルールのIDは、textlintの出力で各エラーの末尾に表示される値です。

| ルールの設定 | `ignoredRules`に書くID |
| --- | --- |
| `rules`に単体のルールを`"ja-no-mixed-period"`として設定 | `ja-no-mixed-period` |
| `rules`にプリセットを`"preset-ja-technical-writing"`として設定し、その中の`ja-no-mixed-period` | `ja-technical-writing/ja-no-mixed-period` |

プリセット内のルールのIDは、プリセット名から`textlint-rule-preset-`または`preset-`を除いた名前と、プリセット内のルール名を`/`でつないだものです。
`ignoredRules`に接頭辞の付いた名前（例: `preset-ja-technical-writing/ja-no-mixed-period`）を書いても、textlintが接頭辞を除きます。

`rules`のキーを`textlint-rule-`の付いたパッケージ名（例: `"textlint-rule-ja-no-mixed-period"`）で書いたルールは、報告を取り消せません。
textlintは`ignoredRules`の値から`textlint-rule-`を除いて照合します。
一方、報告のIDには`rules`のキーがそのまま使われるため、照合が一致しません。
報告を取り消すルールは、`rules`のキーを`textlint-rule-`の無い名前で書いてください。

```json
{
  "plugins": {
    "@cffnpwr/comments": true
  },
  "filters": {
    "@cffnpwr/code-comments": {
      "ignoredRules": ["ja-technical-writing/ja-no-mixed-period"]
    }
  },
  "rules": {
    "preset-ja-technical-writing": true
  }
}
```

## ライセンス

[MIT](./LICENSE)
