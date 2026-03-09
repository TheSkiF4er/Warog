# Contributing

## Setup

```bash
npm install
npm run verify
```

## Development rules

- Keep public APIs small and explicit.
- Add or update tests for every behavioral change.
- Preserve strict TypeScript compatibility.
- Avoid adding runtime dependencies to `@warog/core` unless clearly justified.

## Pull requests

1. Create a focused branch.
2. Update docs and tests together with code.
3. Run `npm run verify` before opening the PR.
4. Describe user-visible changes in `CHANGELOG.md`.
