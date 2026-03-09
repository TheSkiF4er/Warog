# @warog/dom

Production-oriented DOM renderer and JSX runtime for Warog.

## Features

- JSX runtime via `jsxImportSource: "@warog/dom"`
- fine-grained reactive child bindings with function children
- reactive attributes via function props
- function components
- cleanup-aware mounting API

## Example

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
