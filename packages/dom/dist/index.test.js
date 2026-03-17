import test from "node:test";
import assert from "node:assert/strict";
import { ErrorBoundary, createContext, createRef, hydrate, jsx, jsxs, render, useContext } from "./index.js";
import { signal } from "@warog/core";
class MockNode {
    nodeType;
    parentNode = null;
    childNodes = [];
    nodeValue = null;
    constructor(nodeType) {
        this.nodeType = nodeType;
    }
    get firstChild() {
        return this.childNodes[0] ?? null;
    }
    get textContent() {
        if (this.nodeType === 3 || this.nodeType === 8) {
            return this.nodeValue ?? "";
        }
        return this.childNodes.map((child) => child.textContent).join("");
    }
    set textContent(value) {
        this.childNodes = [];
        if (value !== "") {
            this.appendChild(new MockText(value));
        }
    }
    appendChild(node) {
        return this.insertBefore(node, null);
    }
    insertBefore(node, before) {
        if (node.nodeType === 11) {
            const fragmentChildren = [...node.childNodes];
            for (const child of fragmentChildren) {
                node.removeChild(child);
                this.insertBefore(child, before);
            }
            return node;
        }
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        const index = before ? this.childNodes.indexOf(before) : -1;
        if (index >= 0) {
            this.childNodes.splice(index, 0, node);
        }
        else {
            this.childNodes.push(node);
        }
        node.parentNode = this;
        return node;
    }
    removeChild(node) {
        const index = this.childNodes.indexOf(node);
        if (index >= 0) {
            this.childNodes.splice(index, 1);
            node.parentNode = null;
        }
        return node;
    }
}
class MockStyle {
    map = new Map();
    cssText = "";
    setProperty(name, value) {
        this.map.set(name, value);
    }
    removeProperty(name) {
        this.map.delete(name);
    }
    toString() {
        if (this.cssText)
            return this.cssText;
        return [...this.map.entries()].map(([k, v]) => `${k}:${v}`).join(";");
    }
}
class MockElement extends MockNode {
    tagName;
    attributes = new Map();
    style = new MockStyle();
    className = "";
    value = "";
    checked = false;
    selected = false;
    disabled = false;
    listeners = new Map();
    constructor(tagName) {
        super(1);
        this.tagName = tagName.toUpperCase();
    }
    setAttribute(name, value) {
        this.attributes.set(name, value);
        if (name === "class")
            this.className = value;
        if (name === "style")
            this.style.cssText = value;
    }
    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }
    removeAttribute(name) {
        this.attributes.delete(name);
        if (name === "class")
            this.className = "";
        if (name === "style")
            this.style.cssText = "";
    }
    addEventListener(name, listener) {
        this.listeners.set(name, listener);
    }
    removeEventListener(name) {
        this.listeners.delete(name);
    }
    dispatch(name) {
        this.listeners.get(name)?.({ type: name });
    }
}
class MockText extends MockNode {
    constructor(value) {
        super(3);
        this.nodeValue = value;
    }
}
class MockComment extends MockNode {
    constructor(value) {
        super(8);
        this.nodeValue = value;
    }
}
class MockDocumentFragment extends MockNode {
    constructor() {
        super(11);
    }
}
class MockDocument {
    createElement(tag) {
        return new MockElement(tag);
    }
    createTextNode(value) {
        return new MockText(value);
    }
    createComment(value) {
        return new MockComment(value);
    }
    createDocumentFragment() {
        return new MockDocumentFragment();
    }
}
function installDom() {
    const document = new MockDocument();
    const root = document.createElement("div");
    globalThis.document = document;
    return root;
}
function serialize(node) {
    if (node.nodeType === 3)
        return node.nodeValue ?? "";
    if (node.nodeType === 8)
        return "";
    if (node.nodeType === 11)
        return node.childNodes.map(serialize).join("");
    const element = node;
    const attrs = [...element.attributes.entries()]
        .map(([k, v]) => ` ${k}="${v}"`)
        .join("");
    return `<${element.tagName.toLowerCase()}${attrs}>${element.childNodes.map(serialize).join("")}</${element.tagName.toLowerCase()}>`;
}
test("render mounts and updates text content", () => {
    const root = installDom();
    render(root, jsx("div", { children: "hello" }));
    assert.equal(serialize(root), '<div><div>hello</div></div>');
    render(root, jsx("div", { children: "world" }));
    assert.equal(serialize(root), '<div><div>world</div></div>');
});
test("keyed reconciliation preserves node identity during reorder", () => {
    const root = installDom();
    render(root, jsx("ul", {
        children: [
            jsx("li", { children: "a" }, "a"),
            jsx("li", { children: "b" }, "b"),
            jsx("li", { children: "c" }, "c")
        ]
    }));
    const list = root.firstChild;
    const a = list.childNodes[0];
    const b = list.childNodes[1];
    const c = list.childNodes[2];
    render(root, jsx("ul", {
        children: [
            jsx("li", { children: "c" }, "c"),
            jsx("li", { children: "a" }, "a"),
            jsx("li", { children: "b" }, "b")
        ]
    }));
    assert.equal(list.childNodes[0], c);
    assert.equal(list.childNodes[1], a);
    assert.equal(list.childNodes[2], b);
});
test("prop patching covers class style and event listeners", () => {
    const root = installDom();
    let clicks = 0;
    render(root, jsx("button", { class: "a", style: { color: "red" }, onClick: () => { clicks += 1; }, children: "go" }));
    const button = root.firstChild;
    assert.equal(button.getAttribute("class"), "a");
    assert.equal(button.style.toString(), "color:red");
    button.dispatch("click");
    assert.equal(clicks, 1);
    render(root, jsx("button", { class: "b", style: { background: "black" }, onClick: () => { clicks += 10; }, children: "go" }));
    assert.equal(button.getAttribute("class"), "b");
    assert.equal(button.style.toString(), "background:black");
    button.dispatch("click");
    assert.equal(clicks, 11);
});
test("controlled inputs sync value checked selected and textarea", () => {
    const root = installDom();
    render(root, jsxs("div", {
        children: [
            jsx("input", { value: "hello" }),
            jsx("input", { type: "checkbox", checked: true }),
            jsx("option", { selected: true, children: "x" }),
            jsx("textarea", { value: "note" })
        ]
    }));
    const wrap = root.firstChild;
    assert.equal(wrap.childNodes[0].value, "hello");
    assert.equal(wrap.childNodes[1].checked, true);
    assert.equal(wrap.childNodes[2].selected, true);
    assert.equal(wrap.childNodes[3].value, "note");
});
test("refs API supports callback refs and object refs", () => {
    const root = installDom();
    let seen = null;
    const ref = createRef();
    render(root, jsx("div", { ref: (node) => { seen = node; } }));
    assert.equal(seen, root.firstChild);
    render(root, jsx("span", { ref }));
    assert.equal(ref.current, root.firstChild);
});
test("basic context API passes values through providers", () => {
    const root = installDom();
    const Theme = createContext("light");
    function ReadTheme() {
        return jsx("span", { children: useContext(Theme) });
    }
    render(root, jsx(Theme.Provider, { value: "dark", children: jsx(ReadTheme, {}) }));
    assert.equal(serialize(root), '<div><span>dark</span></div>');
});
test("error boundary renders fallback", () => {
    const root = installDom();
    function Boom() {
        throw new Error("boom");
    }
    render(root, jsx(ErrorBoundary, { fallback: "fallback", children: jsx(Boom, {}) }));
    assert.equal(serialize(root), '<div>fallback</div>');
});
test("component rerenders when tracked signal changes", () => {
    const root = installDom();
    const count = signal(1);
    function Counter() {
        return jsx("p", { children: `count:${count.get()}` });
    }
    render(root, jsx(Counter, {}));
    assert.equal(serialize(root), '<div><p>count:1</p></div>');
    count.set(2);
    assert.equal(serialize(root), '<div><p>count:2</p></div>');
});
test("hydrate reports mismatch and falls back to render", () => {
    const root = installDom();
    root.appendChild(new MockElement("span"));
    const codes = [];
    hydrate(root, jsx("div", { children: "ok" }), {
        onHydrationMismatch: (diagnostic) => {
            codes.push(diagnostic.code);
        }
    });
    assert.deepEqual(codes, ["tag-mismatch"]);
    assert.equal(serialize(root), '<div><div>ok</div></div>');
});
//# sourceMappingURL=index.test.js.map