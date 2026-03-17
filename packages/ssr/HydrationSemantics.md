# Hydration semantics v1

Warog hydration v1 does three things:
1. compares existing DOM against the expected vnode shape and reports mismatch diagnostics;
2. falls back to a client render path when the tree is not trusted;
3. restores form-control state gathered from the pre-hydration DOM so typed input is not lost.

Diagnostics currently cover:
- `missing-node`
- `node-type-mismatch`
- `text-mismatch`
- `tag-mismatch`

SSR-specific helpers:
- `renderToString(...)`
- `renderToStream(...)`
- `createClientOnly(...)`
- `createServerOnly(...)`
