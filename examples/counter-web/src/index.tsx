/** @jsxImportSource @warog/dom */
import { render, createContext, useContext, createRef, ErrorBoundary, jsx } from "@warog/dom";
import { signal } from "@warog/core";

const items = signal([
  { id: "a", title: "Milk" },
  { id: "b", title: "Bread" },
  { id: "c", title: "Cheese" }
]);
const text = signal("Hello Warog");
const done = signal(false);
const flavor = signal("vanilla");
const notes = signal("Try reordering the list");
const theme = signal<"light" | "dark">("light");

const Theme = createContext("light");

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
    <Card title="Controlled forms">
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
    <Card title="Keyed list reconciliation">
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
          <button onClick={() => theme.set(theme.get() === "light" ? "dark" : "light")}>Toggle theme</button>
        </div>

        {jsx(Theme.Provider, { value: theme.get(), children: [jsx(ThemeBadge, {}), <ul>{() => items.get().map((item) => <li key={item.id}>{item.title}</li>)}</ul>] })}
      </div>
    </Card>
  );
}

function CrashyPanel() {
  if (text.get().toLowerCase() === "boom") {
    throw new Error("Demo crash");
  }
  return <p class="muted">Type “boom” to trigger the boundary fallback.</p>;
}

function App() {
  return (
    <main class="app">
      <h1>Warog DOM runtime demo</h1>
      <p class="lead">Controlled forms, keyed lists, refs, context and an error boundary on top of the new reconciler.</p>
      <div class="grid">
        <FormsDemo />
        <ListDemo />
        <Card title="Error boundary">
          {jsx(ErrorBoundary as never, { fallback: <p class="error">Component crashed, but the app stayed mounted.</p>, children: <CrashyPanel /> })}
        </Card>
      </div>
    </main>
  );
}

render(document.getElementById("app")!, <App />);
