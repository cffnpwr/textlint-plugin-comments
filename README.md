# textlint-plugin-comments

[![GitHub License](https://img.shields.io/github/license/cffnpwr/textlint-plugin-comments?style=flat)](./LICENSE)

A monorepo of packages for linting the comments in source code and configuration files with
[textlint](https://textlint.org/).

The plugin lints only the comments.
The filter rule applies writing conventions to code comments that differ from those for documents.

[日本語のREADMEはこちら](./README-ja.md)

## Packages

| Package | Description | npm | JSR |
| --- | --- | --- | --- |
| [plugin-comments](./packages/plugin-comments) | Plugin that lints only the comments in source code and configuration files | [![npm](https://img.shields.io/npm/v/%40cffnpwr%2Ftextlint-plugin-comments?style=flat)](https://www.npmjs.com/package/@cffnpwr/textlint-plugin-comments) | [![JSR](https://jsr.io/badges/@cffnpwr/textlint-plugin-comments)](https://jsr.io/@cffnpwr/textlint-plugin-comments) |
| [filter-rule-code-comments](./packages/filter-rule-code-comments) | Filter rule that suppresses the reports of the specified rules only in source code comments | [![npm](https://img.shields.io/npm/v/%40cffnpwr%2Ftextlint-filter-rule-code-comments?style=flat)](https://www.npmjs.com/package/@cffnpwr/textlint-filter-rule-code-comments) | [![JSR](https://jsr.io/badges/@cffnpwr/textlint-filter-rule-code-comments)](https://jsr.io/@cffnpwr/textlint-filter-rule-code-comments) |

Each package README documents its installation, usage, and options.

## License

[MIT](./LICENSE)
