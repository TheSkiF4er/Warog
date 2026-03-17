# @warog/core

Reactive primitives for Warog.

## API

- `signal(initial)`
- `derive(fn)`
- `watch(fn)`
- `batch(fn)`
- `untrack(fn)`
- `getRuntimeSchedulerSnapshot()`

## Guarantees

- synchronous propagation outside of re-entrant loops
- microtask fallback for re-entrant writes discovered during an active flush
- deterministic cleanup-before-rerun semantics
- ownership-based disposal for nested effects and memos
- dynamic dependency re-tracking on every execution
