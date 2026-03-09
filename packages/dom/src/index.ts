import { watch, type Cleanup } from "@warog/core";

export const Fragment = Symbol.for("warog.fragment");

export type WarogChild =
  | WarogVNode
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => WarogChild)
  | WarogChild[];

export interface WarogElementProps {
  children?: WarogChild;
  class?: string | (() => string | null | undefined) | null;
  className?: string | (() => string | null | undefined) | null;
  style?:
    | string
    | Record<string, string | number | null | undefined>
    | (() => string | Record<string, string | number | null | undefined> | null | undefined)
    | null;
  ref?: ((node: Element) => void) | null;
  [key: string]: unknown;
}

export interface WarogVNode<P = WarogElementProps> {
  type: string | typeof Fragment | Component<P>;
  props: P & { children?: WarogChild };
  key?: string | number;
}

export type Component<P = Record<string, unknown>> = (props: P & { children?: WarogChild }) => WarogChild;

declare global {
  namespace JSX {
    type Element = WarogVNode;
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
}

function isNode(value: unknown): value is Node {
  return typeof Node !== "undefined" && value instanceof Node;
}

function isVNode(value: unknown): value is WarogVNode {
  return Boolean(value) && typeof value === "object" && "type" in (value as Record<string, unknown>) && "props" in (value as Record<string, unknown>);
}

function normalizeChildren(children: WarogChild): WarogChild[] {
  if (Array.isArray(children)) {
    return children.flatMap((child) => normalizeChildren(child));
  }

  return [children];
}

function insertNodeRange(parent: Node, before: Node | null, nodes: Node[]): void {
  for (const node of nodes) {
    parent.insertBefore(node, before);
  }
}

function removeNodeRange(nodes: Node[]): void {
  for (const node of nodes) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
}

function createReactiveRange(parent: Node, before: Node | null, read: () => WarogChild): Cleanup {
  const start = document.createComment("warog-start");
  const end = document.createComment("warog-end");
  parent.insertBefore(start, before);
  parent.insertBefore(end, before);

  let nodes: Node[] = [];
  let cleanups: Cleanup[] = [];

  const stop = watch(() => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups = [];
    removeNodeRange(nodes);
    nodes = [];

    const fragment = document.createDocumentFragment();
    const nextNodes: Node[] = [];
    const nextCleanups: Cleanup[] = [];
    appendChild(fragment, read(), null, nextNodes, nextCleanups);

    insertNodeRange(parent, end, Array.from(fragment.childNodes));
    nodes = nextNodes;
    cleanups = nextCleanups;
  });

  return () => {
    stop();
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups = [];
    removeNodeRange(nodes);
    nodes = [];
    if (start.parentNode) start.parentNode.removeChild(start);
    if (end.parentNode) end.parentNode.removeChild(end);
  };
}

function setStyle(target: HTMLElement, value: string | Record<string, string | number | null | undefined> | null | undefined): void {
  if (value == null) {
    target.removeAttribute("style");
    return;
  }

  if (typeof value === "string") {
    target.style.cssText = value;
    return;
  }

  target.removeAttribute("style");
  for (const [property, propertyValue] of Object.entries(value)) {
    if (propertyValue == null) {
      target.style.removeProperty(property);
      continue;
    }

    target.style.setProperty(property, String(propertyValue));
  }
}

function setProperty(element: Element, name: string, value: unknown): void {
  if (name === "className") {
    if (value == null || value === false) {
      element.removeAttribute("class");
      return;
    }

    element.setAttribute("class", String(value));
    return;
  }

  if (name === "style" && element instanceof HTMLElement) {
    setStyle(
      element,
      typeof value === "string" || value == null
        ? value
        : (value as Record<string, string | number | null | undefined>)
    );
    return;
  }

  if (value == null || value === false) {
    element.removeAttribute(name);
    return;
  }

  if (value === true) {
    element.setAttribute(name, "");
    return;
  }

  element.setAttribute(name, String(value));
}

function appendChild(
  parent: Node,
  child: WarogChild,
  before: Node | null,
  ownedNodes: Node[],
  cleanups: Cleanup[]
): void {
  if (child == null || typeof child === "boolean") {
    return;
  }

  if (typeof child === "function") {
    cleanups.push(createReactiveRange(parent, before, child));
    return;
  }

  if (Array.isArray(child)) {
    for (const item of normalizeChildren(child)) {
      appendChild(parent, item, before, ownedNodes, cleanups);
    }
    return;
  }

  if (typeof child === "string" || typeof child === "number") {
    const textNode = document.createTextNode(String(child));
    parent.insertBefore(textNode, before);
    ownedNodes.push(textNode);
    return;
  }

  if (isNode(child)) {
    parent.insertBefore(child, before);
    ownedNodes.push(child);
    return;
  }

  if (isVNode(child)) {
    const { nodes, cleanups: nodeCleanups } = createNodes(child);
    insertNodeRange(parent, before, nodes);
    ownedNodes.push(...nodes);
    cleanups.push(...nodeCleanups);
  }
}

function createElementNode(vnode: WarogVNode<WarogElementProps>): { nodes: Node[]; cleanups: Cleanup[] } {
  const element = document.createElement(vnode.type as string);
  const cleanups: Cleanup[] = [];

  for (const [name, value] of Object.entries(vnode.props ?? {})) {
    if (name === "children") {
      continue;
    }

    if (name === "ref") {
      if (typeof value === "function") {
        value(element);
      }
      continue;
    }

    if (name.startsWith("on") && typeof value === "function") {
      const eventName = name.slice(2).toLowerCase();
      const handler = value as EventListener;
      element.addEventListener(eventName, handler);
      cleanups.push(() => element.removeEventListener(eventName, handler));
      continue;
    }

    if (typeof value === "function") {
      cleanups.push(
        watch(() => {
          setProperty(element, name, (value as () => unknown)());
        })
      );
      continue;
    }

    setProperty(element, name, value);
  }

  const childNodes: Node[] = [];
  appendChild(element, vnode.props.children, null, childNodes, cleanups);

  return {
    nodes: [element],
    cleanups
  };
}

function createNodes(input: WarogChild): { nodes: Node[]; cleanups: Cleanup[] } {
  if (input == null || typeof input === "boolean") {
    return { nodes: [], cleanups: [] };
  }

  if (Array.isArray(input)) {
    const fragment = document.createDocumentFragment();
    const nodes: Node[] = [];
    const cleanups: Cleanup[] = [];
    for (const child of normalizeChildren(input)) {
      appendChild(fragment, child, null, nodes, cleanups);
    }
    return { nodes: Array.from(fragment.childNodes), cleanups };
  }

  if (typeof input === "string" || typeof input === "number") {
    return { nodes: [document.createTextNode(String(input))], cleanups: [] };
  }

  if (isNode(input)) {
    return { nodes: [input], cleanups: [] };
  }

  if (isVNode(input)) {
    if (input.type === Fragment) {
      return createNodes(input.props.children);
    }

    if (typeof input.type === "function") {
      return createNodes(input.type(input.props));
    }

    return createElementNode(input as WarogVNode<WarogElementProps>);
  }

  return { nodes: [document.createTextNode(String(input))], cleanups: [] };
}

export function mount(target: Element | DocumentFragment, child: WarogChild): Cleanup {
  const cleanups: Cleanup[] = [];
  const nodes: Node[] = [];
  appendChild(target, child, null, nodes, cleanups);
  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    removeNodeRange(nodes);
  };
}

export function render(target: Element | DocumentFragment, child: WarogChild): Cleanup {
  target.textContent = "";
  return mount(target, child);
}

export function hydrate(target: Element | DocumentFragment, child: WarogChild): Cleanup {
  return render(target, child);
}

export function jsx<P>(type: WarogVNode<P>["type"], props: P & { children?: WarogChild }, key?: string): WarogVNode<P> {
  return key === undefined
    ? { type, props }
    : { type, props, key };
}

export const jsxs = jsx;
export const jsxDEV = jsx;
