# DOM runtime contract

## Internal component lifecycle

Function components in `@warog/dom` currently follow this internal lifecycle:

1. invoke component with normalized props
2. materialize returned vnode/child tree immediately
3. attach reactive child ranges and reactive props as owned cleanup scopes
4. on parent cleanup, dispose nested reactive scopes before removing DOM nodes

There is intentionally no public hook API yet. The lifecycle contract is internal and centered on deterministic cleanup.

## VNode / internal tree contract

A vnode is expected to be a plain object of the shape:

```ts
{
  type: string | Fragment | Component,
  props: Record<string, unknown> & { children?: WarogChild },
  key?: string | number
}
```

Renderer expectations:

- `Fragment` unwraps directly to children
- function components must be pure with respect to render output
- function-valued children create reactive ranges
- function-valued props create reactive attribute bindings
- cleanup order is inner-first, then DOM node removal
