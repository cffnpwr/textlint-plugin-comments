# @cffnpwr/textlint-filter-rule-code-comments

[![GitHub License](https://img.shields.io/github/license/cffnpwr/textlint-plugin-comments?style=flat)](./LICENSE)
[![npm Version](https://img.shields.io/npm/v/%40cffnpwr%2Ftextlint-filter-rule-code-comments?style=flat)](https://www.npmjs.com/package/@cffnpwr/textlint-filter-rule-code-comments)
[![JSR Version](https://jsr.io/badges/@cffnpwr/textlint-filter-rule-code-comments)](https://jsr.io/@cffnpwr/textlint-filter-rule-code-comments)

A textlint filter rule that suppresses the reports of the specified rules only in source code comments.

[日本語のREADMEはこちら](./README-ja.md)

With a single configuration file, you can apply different writing conventions to documents and to code comments.
For example, you can require a period at the end of every sentence in documents with
`ja-no-mixed-period`, while writing code comments as noun phrases without a period.

```ts
// 設定ファイルの読み込み
const config = loadConfig();
```

The comment above does not end with a period, but it is not an error because the reports of
`ja-no-mixed-period` are suppressed.
With the same configuration, a sentence without a period in a Markdown document is still an error.

## Target Files

Only files with an extension handled by
[@cffnpwr/textlint-plugin-comments](https://github.com/cffnpwr/textlint-plugin-comments/blob/main/packages/plugin-comments/README.md#supported-languages)
are targeted.
The list of extensions is taken from the plugin.
Extensions are matched the same way textlint selects the plugin that parses a file: by suffix match
against the extension of the file path (`path.extname`).

When the file path is not available, no reports are suppressed.
This is the case when textlint is used through its API without `filePath`.
The textlint CLI requires `--stdin-filename` when linting standard input, so the extension of that file name is used.

## How to Install

This filter rule uses
[@cffnpwr/textlint-plugin-comments](https://github.com/cffnpwr/textlint-plugin-comments/blob/main/packages/plugin-comments/README.md)
to extract comments.
The plugin is installed together as a dependency.

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

## How to Use

Add the plugin to `plugins` and this filter rule to `filters` in `.textlintrc.json`.
The key in `filters` is `@cffnpwr/code-comments`.
The package name `@cffnpwr/textlint-filter-rule-code-comments` also works as the key.

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

## Options

```ts
interface Options {
  ignoredRules?: string[];
}
```

| Option | Default | Description |
| --- | --- | --- |
| `ignoredRules` | `[]` | IDs of the rules whose reports are suppressed in code comments |

When `ignoredRules` is not specified, no reports are suppressed.
`"*"` suppresses the reports of all rules.
Specifying an unknown option key, a value of `ignoredRules` that is not an array, or an empty string
as an element of `ignoredRules` is an error.

### Rule IDs

A rule ID is the value textlint shows at the end of each error in its output.

| Rule configuration | ID in `ignoredRules` |
| --- | --- |
| A single rule configured as `"ja-no-mixed-period"` in `rules` | `ja-no-mixed-period` |
| `ja-no-mixed-period` in a preset configured as `"preset-ja-technical-writing"` in `rules` | `ja-technical-writing/ja-no-mixed-period` |

The ID of a rule in a preset is the preset name without `textlint-rule-preset-` or `preset-`,
followed by `/` and the rule name in the preset.
When `ignoredRules` contains a prefixed name such as
`preset-ja-technical-writing/ja-no-mixed-period`, textlint removes the prefix before matching.

The reports of a rule configured in `rules` with a key that includes `textlint-rule-` (for example,
`"textlint-rule-ja-no-mixed-period"`) cannot be suppressed.
textlint removes `textlint-rule-` from the values in `ignoredRules` before matching, while it uses
the key in `rules` as is for the ID of a report.
Write the key in `rules` without `textlint-rule-` for the rules whose reports you want to suppress.

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

## License

[MIT](./LICENSE)
