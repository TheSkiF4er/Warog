# Supported DOM semantics

`@warog/dom@0.3` currently guarantees the following runtime semantics:

## Reconciler
- mount / update / unmount for element, text, fragment and function component nodes
- children normalization for nested arrays, booleans, nullish values and functions returning children
- keyed child reconciliation with stable node reuse across reorder operations
- root-level incremental updates via repeated `render(target, vnode)`

## Props and patching
- attributes via `setAttribute/removeAttribute`
- DOM properties for common controlled and boolean fields
- `class` / `className`
- `style` as string or object
- event listeners via `on*` props with replacement on update
- callback refs and object refs via `createRef()`

## Controlled inputs
- text-like inputs via `value`
- checkbox / radio via `checked`
- `option[selected]`
- `textarea[value]`
- `select[value]` through property assignment when available in the host DOM

## Composition
- fragments
- function components
- basic context API with `createContext`, `Provider`, `useContext`
- error boundaries v1 with `ErrorBoundary({ fallback })`

## Hydration behaviour
- `hydrate()` currently performs mismatch diagnostics and falls back to client render
- reported diagnostics:
  - `missing-node`
  - `node-type-mismatch`
  - `text-mismatch`
  - `tag-mismatch`

## Current non-goals / known limits
- no fine-grained partial hydration yet
- no portals yet
- no suspense / async boundary model yet
- no delegated event system yet
- no full browser edge-case matrix yet; current test coverage is focused on core DOM semantics and keyed updates
