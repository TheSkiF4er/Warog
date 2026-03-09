export interface CompileResult {
  code: string;
  warnings: string[];
}

export interface CompilerOptions {
  filename?: string;
  mode?: "passthrough" | "warn";
}

export function compile(source: string, options: CompilerOptions = {}): CompileResult {
  const label = options.filename ? ` for ${options.filename}` : "";

  if (options.mode === "passthrough") {
    return {
      code: source,
      warnings: []
    };
  }

  return {
    code: source,
    warnings: [
      `Warog compiler is not required for the DOM runtime yet${label}. Source returned unchanged.`
    ]
  };
}
