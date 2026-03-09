/** @jsxImportSource @warog/dom */
import { render } from "@warog/dom";
import { batch, derive, signal } from "@warog/core";

const count = signal(0);
const doubled = derive(() => count.get() * 2);

function Card(props: { title: string; children?: unknown }) {
  return (
    <section class="card">
      <h2>{props.title}</h2>
      <div>{props.children as never}</div>
    </section>
  );
}

function App() {
  return (
    <main class="app">
      <h1>Warog counter</h1>
      <p class="lead">Signals + JSX + direct DOM updates.</p>
      <div class="grid">
        <Card title="State">
          <p>Count: {() => count.get()}</p>
          <p>Doubled: {() => doubled.get()}</p>
        </Card>
        <Card title="Actions">
          <div class="actions">
            <button onClick={() => count.update((value) => value + 1)}>Increment</button>
            <button onClick={() => count.update((value) => value - 1)}>Decrement</button>
            <button
              onClick={() => {
                batch(() => {
                  count.set(5);
                  count.set(10);
                });
              }}
            >
              Batch to 10
            </button>
            <button onClick={() => count.set(0)}>Reset</button>
          </div>
        </Card>
      </div>
    </main>
  );
}

render(document.getElementById("app")!, <App />);
