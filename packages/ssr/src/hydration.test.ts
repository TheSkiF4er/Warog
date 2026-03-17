import test from 'node:test';
import assert from 'node:assert/strict';

import { hydrate, jsx } from '@warog/dom';

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

  appendChild(node: MockNode): MockNode {
    return this.insertBefore(node, null);
  }

  insertBefore(node: MockNode, before: MockNode | null): MockNode {
    if (node.parentNode) node.parentNode.removeChild(node);
    const index = before ? this.childNodes.indexOf(before) : -1;
    if (index >= 0) this.childNodes.splice(index, 0, node);
    else this.childNodes.push(node);
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
  cssText = '';
  setProperty(name: string, value: string): void {
    this.cssText = this.cssText ? `${this.cssText};${name}:${value}` : `${name}:${value}`;
  }
  removeProperty(_name: string): void {}
}

class MockElement extends MockNode {
  tagName: string;
  attributes = new Map<string, string>();
  style = new MockStyle();
  value = '';
  checked = false;
  selected = false;
  disabled = false;
  type = '';
  listeners = new Map<string, EventListener>();

  constructor(tagName: string) {
    super(1);
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === 'value') this.value = value;
    if (name === 'type') this.type = value;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  addEventListener(name: string, listener: EventListener): void {
    this.listeners.set(name, listener);
  }

  removeEventListener(name: string): void {
    this.listeners.delete(name);
  }

  dispatch(name: string): void {
    this.listeners.get(name)?.(({ type: name, target: this } as unknown) as Event);
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
  const root = document.createElement('div');
  (globalThis as unknown as { document: MockDocument }).document = document;
  return root;
}

test('hydrate reports text mismatch', () => {
  const root = installDom();
  root.appendChild(new MockText('server'));
  const diagnostics: string[] = [];

  hydrate(root as unknown as Element, 'client', {
    onHydrationMismatch: (diagnostic) => diagnostics.push(diagnostic.code)
  });

  assert.deepEqual(diagnostics, ['text-mismatch']);
});

test('hydrate reports conditional branch and list mismatches', () => {
  const root = installDom();
  const div = new MockElement('div');
  div.appendChild(new MockElement('span'));
  const ul = new MockElement('ul');
  ul.appendChild(new MockElement('li'));
  ul.appendChild(new MockElement('li'));
  ul.appendChild(new MockElement('li'));
  div.appendChild(ul);
  root.appendChild(div);
  const diagnostics: string[] = [];

  hydrate(
    root as unknown as Element,
    jsx('div', {
      children: [jsx('span', { children: 'ok' }), jsx('span', { children: 'branch' }), jsx('ul', { children: [jsx('li', { children: 'a' }), jsx('li', { children: 'b' })] })]
    }),
    { onHydrationMismatch: (diagnostic) => diagnostics.push(diagnostic.code) }
  );

  assert.ok(diagnostics.includes('missing-node') || diagnostics.includes('tag-mismatch') || diagnostics.includes('text-mismatch'));
});

test('hydrate recovers input state and rebinds events', () => {
  const root = installDom();
  const input = new MockElement('input');
  input.type = 'text';
  input.value = 'typed by user';
  const button = new MockElement('button');
  button.appendChild(new MockText('go'));
  root.appendChild(input);
  root.appendChild(button);

  let clicks = 0;
  hydrate(
    root as unknown as Element,
    [
      jsx('input', { value: 'server value', onInput: () => undefined }),
      jsx('button', { onClick: () => { clicks += 1; }, children: 'go' })
    ]
  );

  const hydratedInput = root.childNodes.find((node) => (node as MockElement).tagName === 'INPUT') as MockElement;
  const hydratedButton = root.childNodes.find((node) => (node as MockElement).tagName === 'BUTTON') as MockElement;
  assert.equal(hydratedInput.value, 'typed by user');
  hydratedButton.dispatch('click');
  assert.equal(clicks, 1);
});
