# Runtime guarantees

## Reactive core

`@warog/core@0.2.0-beta.0` exposes a beta-stable runtime contract for signals, derived signals, and effects.

### Signal contract

- `signal(initial)` stores a value and only notifies dependents when `Object.is(previous, next)` is false.
- `get()` tracks the currently running computation.
- `peek()` reads without tracking.
- `update(fn)` is equivalent to `set(fn(current))`.
- `subscribe(listener)` attaches a low-level notification listener and returns an idempotent cleanup function.

### Effect contract

- `watch(fn)` runs immediately.
- Each rerun performs cleanup in this order:
  1. dispose owned nested computations
  2. detach previous dependencies
  3. run the previous cleanup callback
  4. execute the new body and collect fresh dependencies
- cleanup returned from `watch` is idempotent.
- effects created inside another effect are owned by the parent and are disposed automatically before the parent reruns or disposes.

### Derived contract

- `derive(fn)` behaves like a memoized readonly signal.
- derived computations track dependencies dynamically on each execution.
- derived values update synchronously unless the scheduler detects a re-entrant write during an active flush.

## Scheduler model

### Sync updates

Outside `batch()` and outside an active flush, signal writes propagate synchronously until the graph is settled.

### Batch flush

Inside `batch()`, writes are coalesced and flushed once when the outermost batch exits.

### Microtask flush

If an effect writes to a dependency while the scheduler is already flushing, the re-entrant rerun is deferred to a microtask. This keeps the current pass stable and avoids immediate recursive re-entry.

### Anti-loop protection

The scheduler aborts after `10_000` synchronous iterations in a single flush pass and throws an error indicating a probable reactive loop.

## DOM/runtime integration contract

The DOM layer should assume:

- cleanup returned by `mount()` is allowed to call the same cleanup multiple times
- nested reactive ranges are owned by the surrounding effect scope
- reactive child and prop bindings observe cleanup-before-rerun semantics

## Known beta boundaries

- component lifecycle hooks are not public yet; ownership and cleanup semantics are internal
- vnode diffing is still intentionally minimal; the runtime contract is centered on correctness, not keyed reconciliation performance
