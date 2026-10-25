const go = { packageName: "tree-sitter-go", wasmFile: "tree-sitter-go.wasm" };
const rust = { packageName: "tree-sitter-rust", wasmFile: "tree-sitter-rust.wasm" };
const python = { packageName: "tree-sitter-python", wasmFile: "tree-sitter-python.wasm" };
const bash = { packageName: "tree-sitter-bash", wasmFile: "tree-sitter-bash.wasm" };
// `tree-sitter-json`は`//`・`/* */`を`comment`として解析するため、JSONCにも使用可能
const json = { packageName: "tree-sitter-json", wasmFile: "tree-sitter-json.wasm" };
const javascript = { packageName: "tree-sitter-javascript", wasmFile: "tree-sitter-javascript.wasm" };
const typescript = { packageName: "tree-sitter-typescript", wasmFile: "tree-sitter-typescript.wasm" };
const tsx = { packageName: "tree-sitter-typescript", wasmFile: "tree-sitter-tsx.wasm" };
const yaml = { packageName: "@tree-sitter-grammars/tree-sitter-yaml", wasmFile: "tree-sitter-yaml.wasm" };
const toml = { packageName: "@tree-sitter-grammars/tree-sitter-toml", wasmFile: "tree-sitter-toml.wasm" };

const grammars = {
  ".go": go,
  ".ts": typescript,
  ".mts": typescript,
  ".cts": typescript,
  ".tsx": tsx,
  ".js": javascript,
  ".mjs": javascript,
  ".cjs": javascript,
  ".jsx": javascript,
  ".rs": rust,
  ".py": python,
  ".pyi": python,
  ".jsonc": json,
  ".json": json,
  ".yaml": yaml,
  ".yml": yaml,
  ".toml": toml,
  ".sh": bash,
  ".bash": bash,
};

const grammarByExtension: ReadonlyMap<string, Grammar> = new Map(Object.entries(grammars));

export const supportedExtensions = [...grammarByExtension.keys()];

export const supportedGrammars: readonly Grammar[] = [...new Set(grammarByExtension.values())];

export type Grammar = { packageName: string; wasmFile: string; };

export class UnsupportedExtensionError extends TypeError {
  override readonly name = "UnsupportedExtensionError" as const;
  readonly extension: string;
  readonly supportedExtensions: readonly string[];

  constructor(extension: string, supportedExtensions: readonly string[]) {
    super(`No language is associated with the extension "${extension}". Supported extensions: ${supportedExtensions.join(", ")}.`);
    this.extension = extension;
    this.supportedExtensions = supportedExtensions;
  }
}

export const grammarOf = (extension: string): Grammar => {
  const grammar = grammarByExtension.get(extension);
  if (grammar === undefined) {
    throw new UnsupportedExtensionError(extension, supportedExtensions);
  }
  return grammar;
};
