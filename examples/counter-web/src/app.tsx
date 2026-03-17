/** @jsxImportSource @warog/dom */
import { createContext, createRef, ErrorBoundary, jsx, useContext } from '@warog/dom';
import { signal } from '@warog/core';

const items = signal([
  { id: 'a', title: 'Milk' },
  { id: 'b', title: 'Bread' },
  { id: 'c', title: 'Cheese' }
]);
const text = signal('Hello Warog');
const done = signal(false);
const flavor = signal('vanilla');
const notes = signal('Hydrated from SSR');
const theme = signal<'light' | 'dark'>('light');
const showHints = signal(true);

const Theme = createContext('light');

function Card(props: { title: string; children?: unknown }) {
  return (
    <section class="card">
      <h2>{props.title}</h2>
      <div>{props.children as never}</div>
    </section>
  );
}

function ThemeBadge() {
  const current = useContext(Theme);
  return <span class={() => `badge badge-${current}`}>theme: {current}</span>;
}

function FormsDemo() {
  const inputRef = createRef<Element>();

  return (
    <Card title="SSR + hydration forms">
      <div class="stack">
        <label>
          <span>Text input</span>
          <input
            ref={inputRef}
            value={() => text.get()}
            onInput={(event: Event) => text.set((event.target as HTMLInputElement).value)}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={() => done.get()}
            onChange={(event: Event) => done.set((event.target as HTMLInputElement).checked)}
          />
          <span>Completed</span>
        </label>

        <label>
          <span>Select flavor</span>
          <select value={() => flavor.get()} onChange={(event: Event) => flavor.set((event.target as HTMLSelectElement).value)}>
            <option value="vanilla">Vanilla</option>
            <option value="chocolate">Chocolate</option>
            <option value="strawberry">Strawberry</option>
          </select>
        </label>

        <label>
          <span>Textarea</span>
          <textarea value={() => notes.get()} onInput={(event: Event) => notes.set((event.target as HTMLTextAreaElement).value)} />
        </label>

        <pre class="preview">{() => JSON.stringify({ text: text.get(), done: done.get(), flavor: flavor.get(), notes: notes.get() }, null, 2)}</pre>
      </div>
    </Card>
  );
}

function ListDemo() {
  return (
    <Card title="Keyed list hydration stability">
      <div class="stack">
        <div class="actions">
          <button
            onClick={() => {
              const current = items.get();
              items.set([current[2]!, current[0]!, current[1]!]);
            }}
          >
            Reorder
          </button>
          <button
            onClick={() => {
              const nextId = `item-${items.get().length + 1}`;
              items.set([...items.get(), { id: nextId, title: `New ${nextId}` }]);
            }}
          >
            Add item
          </button>
          <button onClick={() => theme.set(theme.get() === 'light' ? 'dark' : 'light')}>Toggle theme</button>
          <button onClick={() => showHints.set(!showHints.get())}>Toggle hint</button>
        </div>

        {jsx(Theme.Provider, {
          value: theme.get(),
          children: [
            jsx(ThemeBadge, {}),
            showHints.get() ? <p class="muted">This block intentionally changes shape to exercise hydration diagnostics.</p> : null,
            <ul>{() => items.get().map((item) => <li key={item.id}>{item.title}</li>)}</ul>
          ]
        })}
      </div>
    </Card>
  );
}

function CrashyPanel() {
  if (text.get().toLowerCase() === 'boom') {
    throw new Error('Demo crash');
  }
  return <p class="muted">Type “boom” to trigger the boundary fallback.</p>;
}

export function App() {
  return (
    <main class="app">
      <h1>Warog SSR + hydration demo</h1>
      <p class="lead">Server-rendered HTML, client hydration, controlled inputs, keyed lists, context and an SSR-safe error boundary.</p>
      <div class="grid">
        <FormsDemo />
        <ListDemo />
        <Card title="Error boundary">
          {jsx(ErrorBoundary as never, { fallback: <p class="error">Component crashed, but hydration kept the app mounted.</p>, children: <CrashyPanel /> })}
        </Card>
      </div>
    </main>
  );
}
