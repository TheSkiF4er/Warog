import { jsx as _jsx, jsxs as _jsxs } from "@warog/dom/jsx-runtime";
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
const theme = signal('light');
const showHints = signal(true);
const Theme = createContext('light');
function Card(props) {
    return (_jsxs("section", { class: "card", children: [_jsx("h2", { children: props.title }), _jsx("div", { children: props.children })] }));
}
function ThemeBadge() {
    const current = useContext(Theme);
    return _jsxs("span", { class: () => `badge badge-${current}`, children: ["theme: ", current] });
}
function FormsDemo() {
    const inputRef = createRef();
    return (_jsx(Card, { title: "SSR + hydration forms", children: _jsxs("div", { class: "stack", children: [_jsxs("label", { children: [_jsx("span", { children: "Text input" }), _jsx("input", { ref: inputRef, value: () => text.get(), onInput: (event) => text.set(event.target.value) })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: () => done.get(), onChange: (event) => done.set(event.target.checked) }), _jsx("span", { children: "Completed" })] }), _jsxs("label", { children: [_jsx("span", { children: "Select flavor" }), _jsxs("select", { value: () => flavor.get(), onChange: (event) => flavor.set(event.target.value), children: [_jsx("option", { value: "vanilla", children: "Vanilla" }), _jsx("option", { value: "chocolate", children: "Chocolate" }), _jsx("option", { value: "strawberry", children: "Strawberry" })] })] }), _jsxs("label", { children: [_jsx("span", { children: "Textarea" }), _jsx("textarea", { value: () => notes.get(), onInput: (event) => notes.set(event.target.value) })] }), _jsx("pre", { class: "preview", children: () => JSON.stringify({ text: text.get(), done: done.get(), flavor: flavor.get(), notes: notes.get() }, null, 2) })] }) }));
}
function ListDemo() {
    return (_jsx(Card, { title: "Keyed list hydration stability", children: _jsxs("div", { class: "stack", children: [_jsxs("div", { class: "actions", children: [_jsx("button", { onClick: () => {
                                const current = items.get();
                                items.set([current[2], current[0], current[1]]);
                            }, children: "Reorder" }), _jsx("button", { onClick: () => {
                                const nextId = `item-${items.get().length + 1}`;
                                items.set([...items.get(), { id: nextId, title: `New ${nextId}` }]);
                            }, children: "Add item" }), _jsx("button", { onClick: () => theme.set(theme.get() === 'light' ? 'dark' : 'light'), children: "Toggle theme" }), _jsx("button", { onClick: () => showHints.set(!showHints.get()), children: "Toggle hint" })] }), jsx(Theme.Provider, {
                    value: theme.get(),
                    children: [
                        jsx(ThemeBadge, {}),
                        showHints.get() ? _jsx("p", { class: "muted", children: "This block intentionally changes shape to exercise hydration diagnostics." }) : null,
                        _jsx("ul", { children: () => items.get().map((item) => _jsx("li", { children: item.title }, item.id)) })
                    ]
                })] }) }));
}
function CrashyPanel() {
    if (text.get().toLowerCase() === 'boom') {
        throw new Error('Demo crash');
    }
    return _jsx("p", { class: "muted", children: "Type \u201Cboom\u201D to trigger the boundary fallback." });
}
export function App() {
    return (_jsxs("main", { class: "app", children: [_jsx("h1", { children: "Warog SSR + hydration demo" }), _jsx("p", { class: "lead", children: "Server-rendered HTML, client hydration, controlled inputs, keyed lists, context and an SSR-safe error boundary." }), _jsxs("div", { class: "grid", children: [_jsx(FormsDemo, {}), _jsx(ListDemo, {}), _jsx(Card, { title: "Error boundary", children: jsx(ErrorBoundary, { fallback: _jsx("p", { class: "error", children: "Component crashed, but hydration kept the app mounted." }), children: _jsx(CrashyPanel, {}) }) })] })] }));
}
//# sourceMappingURL=app.js.map