# Warog

Warog is a signal-first UI framework with a production-oriented reactive core, a lightweight DOM + JSX runtime, a router, and server-side rendering primitives.

## What is production-ready in this repo

This repository now includes:

- `@warog/core`: fine-grained reactivity primitives
- `@warog/dom`: DOM renderer and JSX runtime for browser apps
- `@warog/compiler`: compatibility placeholder for future compile-time features
- `@warog/router`: signal-first route matching and browser navigation
- `@warog/ssr`: server-side rendering helpers
- `examples/counter-web`: browser example built from TSX to static assets
- GitHub Actions, contribution docs, security policy, release metadata

## Current scope

Warog is production-ready for small to medium browser applications that want:

- direct DOM updates instead of virtual DOM diffing
- signal-based state
- TSX authoring with `jsxImportSource`
- minimal runtime surface area

What is not included yet:

- server actions
- devtools
- advanced keyed reconciliation
- concurrent rendering / scheduling
- mature ecosystem breadth comparable to React

## Packages

### `@warog/core`

```ts
import { batch, derive, signal, watch } from "@warog/core";
```

### `@warog/dom`

```tsx
/** @jsxImportSource @warog/dom */
import { render } from "@warog/dom";
import { signal } from "@warog/core";

const count = signal(0);

function App() {
  return (
    <main>
      <h1>{() => `Count: ${count.get()}`}</h1>
      <button onClick={() => count.update((value) => value + 1)}>Increment</button>
    </main>
  );
}

render(document.getElementById("app")!, <App />);
```

## Development

```bash
npm install
npm run verify
```

## Build the browser example

```bash
npm --workspace @warog/example-counter-web run build
```

Then open `examples/counter-web/dist/index.html` in a browser. The example is self-contained and uses an import map with local `dist/vendor` modules, so no external dev server or bundler is required.

## Publishing

Each public package is ready for npm publication:

- `@warog/core`
- `@warog/dom`
- `@warog/router`
- `@warog/ssr`
- `@warog/compiler`

## License

MIT
