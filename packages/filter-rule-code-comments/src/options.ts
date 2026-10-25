import { type } from "arktype";

// オプション名の綴りの誤りを例外として報告するため、未知のキーを拒否
const optionsSchema = type({
  "+": "reject",
  // textlintは空文字列のルールIDを、全ルールを表す`*`として扱うため拒否
  ignoredRules: type("string > 0").array().default(() => []),
});

export type Options = typeof optionsSchema.infer;

export class InvalidOptionsError extends TypeError {
  override readonly name = "InvalidOptionsError" as const;

  constructor(summary: string) {
    super(`Invalid options for the filter rule "@cffnpwr/code-comments": ${summary}`);
  }
}

export const parseOptions = (rawOptions: unknown): Options => {
  const options = optionsSchema(rawOptions);
  if (options instanceof type.errors) {
    throw new InvalidOptionsError(options.summary);
  }

  return options;
};
