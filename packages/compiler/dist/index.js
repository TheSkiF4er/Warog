export function compile(source, options = {}) {
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
//# sourceMappingURL=index.js.map