export interface CompileResult {
    code: string;
    warnings: string[];
}
export interface CompilerOptions {
    filename?: string;
    mode?: "passthrough" | "warn";
}
export declare function compile(source: string, options?: CompilerOptions): CompileResult;
//# sourceMappingURL=index.d.ts.map