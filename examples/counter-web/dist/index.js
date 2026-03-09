import { jsx as _jsx, jsxs as _jsxs } from "@warog/dom/jsx-runtime";
/** @jsxImportSource @warog/dom */
import { render } from "@warog/dom";
import { batch, derive, signal } from "@warog/core";
const count = signal(0);
const doubled = derive(() => count.get() * 2);
function Card(props) {
    return (_jsxs("section", { class: "card", children: [_jsx("h2", { children: props.title }), _jsx("div", { children: props.children })] }));
}
function App() {
    return (_jsxs("main", { class: "app", children: [_jsx("h1", { children: "Warog counter" }), _jsx("p", { class: "lead", children: "Signals + JSX + direct DOM updates." }), _jsxs("div", { class: "grid", children: [_jsxs(Card, { title: "State", children: [_jsxs("p", { children: ["Count: ", () => count.get()] }), _jsxs("p", { children: ["Doubled: ", () => doubled.get()] })] }), _jsx(Card, { title: "Actions", children: _jsxs("div", { class: "actions", children: [_jsx("button", { onClick: () => count.update((value) => value + 1), children: "Increment" }), _jsx("button", { onClick: () => count.update((value) => value - 1), children: "Decrement" }), _jsx("button", { onClick: () => {
                                        batch(() => {
                                            count.set(5);
                                            count.set(10);
                                        });
                                    }, children: "Batch to 10" }), _jsx("button", { onClick: () => count.set(0), children: "Reset" })] }) })] })] }));
}
render(document.getElementById("app"), _jsx(App, {}));
//# sourceMappingURL=index.js.map