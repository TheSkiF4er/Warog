import test from "node:test";
import assert from "node:assert/strict";

import {
  ErrorBoundary,
  createContext,
  createRef,
  hydrate,
  jsx,
  jsxs,
  render,
  useContext,
  type WarogChild
} from "./index.js";
import { signal } from "@warog/core";

class MockNode {
  nodeType: number;
  parentNode: MockNode | null = null;
  childNodes: MockNode[] = [];
  nodeValue: string | null = null;

  constructor(nodeType: number) {
    this.nodeType = nodeType;
  }

  get firstChild(): MockNode | null {
    return this.childNodes[0] ?? null;
  }

  get textContent(): string {
    if (this.nodeType === 3 || this.nodeType === 8) {
      return this.nodeValue ?? "";
    }
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value: string) {
    this.childNodes = [];
    if (value !== "") {
      this.appendChild(new MockText(value));
    }
  }

  appendChild(node: MockNode): MockNode {
    return this.insertBefore(node, null);
  }

  insertBefore(node: MockNode, before: MockNode | null): MockNode {
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
    } else {
      this.childNodes.push(node);
    }
    node.parentNode = this;
    return node;
  }

  removeChild(node: MockNode): MockNode {
    const index = this.childNodes.indexOf(node);
    if (index >= 0) {
      this.childNodes.splice(index, 1);
      node.parentNode = null;
    }
    return node;
  }
}

class MockStyle {
  private map = new Map<string, string>();
  cssText = "";

  setProperty(name: string, value: string): void {
    this.map.set(name, value);
  }

  removeProperty(name: string): void {
    this.map.delete(name);
  }

  toString(): string {
    if (this.cssText) return this.cssText;
    return [...this.map.entries()].map(([k, v]) => `${k}:${v}`).join(";");
  }
}

class MockElement extends MockNode {
  tagName: string;
  attributes = new Map<string, string>();
  style = new MockStyle();
  className = "";
  value = "";
  checked = false;
  selected = false;
  disabled = false;
  listeners = new Map<string, EventListener>();

  constructor(tagName: string) {
    super(1);
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === "class") this.className = value;
    if (name === "style") this.style.cssText = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
    if (name === "class") this.className = "";
    if (name === "style") this.style.cssText = "";
  }

  addEventListener(name: string, listener: EventListener): void {
    this.listeners.set(name, listener);
  }

  removeEventListener(name: string): void {
    this.listeners.delete(name);
  }

  dispatch(name: string): void {
    this.listeners.get(name)?.({ type: name } as Event);
  }
}

class MockText extends MockNode {
  constructor(value: string) {
    super(3);
    this.nodeValue = value;
  }
}

class MockComment extends MockNode {
  constructor(value: string) {
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
  createElement(tag: string): MockElement {
    return new MockElement(tag);
  }
  createTextNode(value: string): MockText {
    return new MockText(value);
  }
  createComment(value: string): MockComment {
    return new MockComment(value);
  }
  createDocumentFragment(): MockDocumentFragment {
    return new MockDocumentFragment();
  }
}

function installDom(): MockElement {
  const document = new MockDocument();
  const root = document.createElement("div");
  (globalThis as unknown as { document: MockDocument }).document = document;
  return root;
}

function serialize(node: MockNode): string {
  if (node.nodeType === 3) return node.nodeValue ?? "";
  if (node.nodeType === 8) return "";
  if (node.nodeType === 11) return node.childNodes.map(serialize).join("");
  const element = node as MockElement;
  const attrs = [...element.attributes.entries()]
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  return `<${element.tagName.toLowerCase()}${attrs}>${element.childNodes.map(serialize).join("")}</${element.tagName.toLowerCase()}>`;
}

test("render mounts and updates text content", () => {
  const root = installDom();
  render(root as unknown as Element, jsx("div", { children: "hello" }));
  assert.equal(serialize(root), '<div><div>hello</div></div>');

  render(root as unknown as Element, jsx("div", { children: "world" }));
  assert.equal(serialize(root), '<div><div>world</div></div>');
});

test("keyed reconciliation preserves node identity during reorder", () => {
  const root = installDom();
  render(
    root as unknown as Element,
    jsx("ul", {
      children: [
        jsx("li", { children: "a" }, "a"),
        jsx("li", { children: "b" }, "b"),
        jsx("li", { children: "c" }, "c")
      ]
    })
  );

  const list = root.firstChild as MockElement;
  const a = list.childNodes[0];
  const b = list.childNodes[1];
  const c = list.childNodes[2];

  render(
    root as unknown as Element,
    jsx("ul", {
      children: [
        jsx("li", { children: "c" }, "c"),
        jsx("li", { children: "a" }, "a"),
        jsx("li", { children: "b" }, "b")
      ]
    })
  );

  assert.equal(list.childNodes[0], c);
  assert.equal(list.childNodes[1], a);
  assert.equal(list.childNodes[2], b);
});

test("prop patching covers class style and event listeners", () => {
  const root = installDom();
  let clicks = 0;
  render(root as unknown as Element, jsx("button", { class: "a", style: { color: "red" }, onClick: () => { clicks += 1; }, children: "go" }));
  const button = root.firstChild as MockElement;
  assert.equal(button.getAttribute("class"), "a");
  assert.equal(button.style.toString(), "color:red");
  button.dispatch("click");
  assert.equal(clicks, 1);

  render(root as unknown as Element, jsx("button", { class: "b", style: { background: "black" }, onClick: () => { clicks += 10; }, children: "go" }));
  assert.equal(button.getAttribute("class"), "b");
  assert.equal(button.style.toString(), "background:black");
  button.dispatch("click");
  assert.equal(clicks, 11);
});

test("controlled inputs sync value checked selected and textarea", () => {
  const root = installDom();
  render(
    root as unknown as Element,
    jsxs("div", {
      children: [
        jsx("input", { value: "hello" }),
        jsx("input", { type: "checkbox", checked: true }),
        jsx("option", { selected: true, children: "x" }),
        jsx("textarea", { value: "note" })
      ]
    })
  );
  const wrap = root.firstChild as MockElement;
  assert.equal((wrap.childNodes[0] as MockElement).value, "hello");
  assert.equal((wrap.childNodes[1] as MockElement).checked, true);
  assert.equal((wrap.childNodes[2] as MockElement).selected, true);
  assert.equal((wrap.childNodes[3] as MockElement).value, "note");
});

test("refs API supports callback refs and object refs", () => {
  const root = installDom();
  let seen: Element | null = null;
  const ref = createRef<Element>();
  render(root as unknown as Element, jsx("div", { ref: (node: Element | null) => { seen = node; } }));
  assert.equal(seen, root.firstChild as unknown as Element);

  render(root as unknown as Element, jsx("span", { ref }));
  assert.equal(ref.current, root.firstChild as unknown as Element);
});

test("basic context API passes values through providers", () => {
  const root = installDom();
  const Theme = createContext("light");

  function ReadTheme(): WarogChild {
    return jsx("span", { children: useContext(Theme) });
  }

  render(root as unknown as Element, jsx(Theme.Provider, { value: "dark", children: jsx(ReadTheme, {}) }));
  assert.equal(serialize(root), '<div><span>dark</span></div>');
});

test("error boundary renders fallback", () => {
  const root = installDom();
  function Boom(): WarogChild {
    throw new Error("boom");
  }

  render(root as unknown as Element, jsx(ErrorBoundary, { fallback: "fallback", children: jsx(Boom, {}) }));
  assert.equal(serialize(root), '<div>fallback</div>');
});

test("component rerenders when tracked signal changes", () => {
  const root = installDom();
  const count = signal(1);

  function Counter(): WarogChild {
    return jsx("p", { children: `count:${count.get()}` });
  }

  render(root as unknown as Element, jsx(Counter, {}));
  assert.equal(serialize(root), '<div><p>count:1</p></div>');
  count.set(2);
  assert.equal(serialize(root), '<div><p>count:2</p></div>');
});

test("hydrate reports mismatch and falls back to render", () => {
  const root = installDom();
  root.appendChild(new MockElement("span"));
  const codes: string[] = [];
  hydrate(root as unknown as Element, jsx("div", { children: "ok" }), {
    onHydrationMismatch: (diagnostic) => {
      codes.push(diagnostic.code);
    }
  });
  assert.deepEqual(codes, ["tag-mismatch"]);
  assert.equal(serialize(root), '<div><div>ok</div></div>');
});
