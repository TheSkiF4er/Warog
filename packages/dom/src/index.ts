import { watch, type Cleanup } from "@warog/core";

export const Fragment = Symbol.for("warog.fragment");
const TEXT_NODE = Symbol.for("warog.text");
const PROVIDER_TYPE = Symbol.for("warog.context.provider");
const ERROR_BOUNDARY_TYPE = Symbol.for("warog.error-boundary");

export type WarogChild =
  | WarogVNode<any>
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => WarogChild)
  | WarogChild[];

export interface RefObject<T> {
  current: T | null;
}

export interface WarogElementProps {
  children?: WarogChild;
  class?: string | (() => string | null | undefined) | null;
  className?: string | (() => string | null | undefined) | null;
  style?:
    | string
    | Record<string, string | number | null | undefined>
    | (() => string | Record<string, string | number | null | undefined> | null | undefined)
    | null;
  ref?: Ref<Element> | null;
  [key: string]: unknown;
}

export interface Context<T> {
  readonly id: symbol;
  readonly defaultValue: T;
  Provider: Component<{ value: T; children?: WarogChild }> & { $$typeof: symbol; _context: Context<T> };
}

export type Ref<T> = ((value: T | null) => void) | RefObject<T>;
export type Component<P = Record<string, unknown>> = (props: P & { children?: WarogChild }) => WarogChild;

export interface WarogVNode<P = WarogElementProps> {
  type: string | typeof Fragment | typeof TEXT_NODE | Component<P> | ProviderComponent<unknown> | typeof ERROR_BOUNDARY_TYPE;
  props: P & { children?: WarogChild };
  key?: string | number;
}

type ProviderComponent<T> = Component<{ value: T; children?: WarogChild }> & { $$typeof: symbol; _context: Context<T> };

type ResolvedVNode = WarogVNode<any> | null;

type HydrationMismatchCode = "missing-node" | "node-type-mismatch" | "text-mismatch" | "tag-mismatch";

export interface ErrorBoundaryProps {
  fallback: WarogChild | ((error: unknown) => WarogChild);
  onError?: (error: unknown) => void;
  children?: WarogChild;
}

export interface HydrationDiagnostic {
  code: HydrationMismatchCode;
  message: string;
}

export interface RenderRoot {
  update(next: WarogChild): void;
  dispose(): void;
}

export interface RenderOptions {
  onHydrationMismatch?: (diagnostic: HydrationDiagnostic) => void;
}

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

interface ReconcilerContext {
  readonly hydrationMode: boolean;
  readonly onHydrationMismatch?: (diagnostic: HydrationDiagnostic) => void;
}

interface Instance {
  key: string | number | null;
  vnode: ResolvedVNode;
  parentDom: Node;
  contextMap: Map<symbol, unknown>;
  mount(before: Node | null): void;
  update(nextVNode: ResolvedVNode): void;
  unmount(): void;
  firstNode(): Node | null;
  nodes(): Node[];
}

interface ComponentInstance extends Instance {
  boundary: ErrorBoundaryInstance | null;
}

let currentComponent: RuntimeComponentInstance | null = null;
const roots = new WeakMap<Node, RenderRootImpl>();

function isNode(value: unknown): value is Node {
  return Boolean(value) && typeof value === "object" && "nodeType" in (value as Record<string, unknown>);
}

function isElementNode(node: Node | null | undefined): node is Element {
  return node != null && node.nodeType === 1;
}

function isTextNode(node: Node | null | undefined): node is Text {
  return node != null && node.nodeType === 3;
}

function isVNode(value: unknown): value is WarogVNode {
  return Boolean(value) && typeof value === "object" && "type" in (value as Record<string, unknown>) && "props" in (value as Record<string, unknown>);
}

function sameType(a: ResolvedVNode, b: ResolvedVNode): boolean {
  if (!a || !b) return false;
  return a.type === b.type && a.key === b.key;
}

function createRef<T>(): RefObject<T> {
  return { current: null };
}
export { createRef };

export function createContext<T>(defaultValue: T): Context<T> {
  const context: Context<T> = {
    id: Symbol("warog.context"),
    defaultValue,
    Provider: Object.assign(
      ((props: { value: T; children?: WarogChild }) => props.children ?? null) as Component<{ value: T; children?: WarogChild }>,
      {
        $$typeof: PROVIDER_TYPE,
        _context: undefined as unknown as Context<T>
      }
    )
  };
  (context.Provider as ProviderComponent<T>)._context = context;
  return context;
}

export function useContext<T>(context: Context<T>): T {
  if (!currentComponent) {
    return context.defaultValue;
  }
  if (currentComponent.contextMap.has(context.id)) {
    return currentComponent.contextMap.get(context.id) as T;
  }
  return context.defaultValue;
}

export function ErrorBoundary(props: ErrorBoundaryProps): WarogVNode<ErrorBoundaryProps> {
  return { type: ERROR_BOUNDARY_TYPE, props };
}

function normalizeChildren(children: WarogChild): WarogChild[] {
  if (Array.isArray(children)) {
    return children.flatMap((child) => normalizeChildren(child));
  }
  return [children];
}

function toChildArray(children: WarogChild): WarogChild[] {
  return normalizeChildren(children).filter((child) => child != null && child !== false && child !== true);
}

function toVNode(child: WarogChild): ResolvedVNode {
  if (child == null || typeof child === "boolean") return null;
  if (Array.isArray(child)) return { type: Fragment, props: { children: child } };
  if (typeof child === "string" || typeof child === "number") {
    return { type: TEXT_NODE, props: { nodeValue: String(child) } } as WarogVNode<{ nodeValue: string }>;
  }
  if (typeof child === "function") {
    return { type: Dynamic, props: { read: child } } as WarogVNode<{ read: () => WarogChild }>;
  }
  if (isVNode(child)) return child;
  if (isNode(child)) {
    return { type: NativeNode, props: { node: child } } as WarogVNode<{ node: Node }>;
  }
  return { type: TEXT_NODE, props: { nodeValue: String(child) } } as WarogVNode<{ nodeValue: string }>;
}

function getKey(vnode: ResolvedVNode, index: number): string | number {
  return vnode?.key ?? `__index_${index}`;
}

function callRef(ref: Ref<Element> | null | undefined, value: Element | null): void {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

function insertRange(parent: Node, before: Node | null, nodes: Node[]): void {
  for (const node of nodes) {
    parent.insertBefore(node, before);
  }
}

function removeNodes(nodes: Node[]): void {
  for (const node of nodes) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
}

function moveNodes(parent: Node, before: Node | null, nodes: Node[]): void {
  insertRange(parent, before, nodes);
}

function setClass(element: Element, value: unknown): void {
  if (value == null || value === false) {
    element.removeAttribute("class");
    return;
  }
  element.setAttribute("class", String(value));
}

function setStyle(target: Element, value: string | Record<string, string | number | null | undefined> | null | undefined, previous?: string | Record<string, string | number | null | undefined> | null): void {
  if (!("style" in target)) {
    if (value == null) target.removeAttribute("style");
    else target.setAttribute("style", typeof value === "string" ? value : Object.entries(value).filter(([, v]) => v != null).map(([k, v]) => `${k}:${String(v)}`).join(";"));
    return;
  }

  const style = (target as HTMLElement).style;
  if (value == null) {
    target.removeAttribute("style");
    return;
  }
  if (typeof value === "string") {
    style.cssText = value;
    return;
  }

  if (previous && typeof previous !== "string") {
    for (const key of Object.keys(previous)) {
      if (!(key in value)) {
        style.removeProperty(key);
      }
    }
  } else {
    style.cssText = "";
  }

  for (const [property, propertyValue] of Object.entries(value)) {
    if (propertyValue == null) style.removeProperty(property);
    else style.setProperty(property, String(propertyValue));
  }
}

function shouldSetAsProperty(element: Element, name: string, value: unknown): boolean {
  if (name === "value" || name === "checked" || name === "selected" || name === "muted" || name === "disabled") return true;
  return name in element && typeof value !== "string";
}

function patchDomProperty(element: Element, name: string, value: unknown, previous: unknown): void {
  if (name === "class" || name === "className") {
    setClass(element, value);
    return;
  }
  if (name === "style") {
    setStyle(element, value as string | Record<string, string | number | null | undefined> | null | undefined, previous as string | Record<string, string | number | null | undefined> | null | undefined);
    return;
  }
  if (name === "ref" || name === "children" || name === "key") {
    return;
  }

  if (name.startsWith("on")) {
    const store = ((element as Element & { __warogEvents?: Record<string, EventListener> }).__warogEvents ??= {});
    const eventName = name.slice(2).toLowerCase();
    const prior = store[eventName];
    if (prior) {
      element.removeEventListener(eventName, prior);
      delete store[eventName];
    }
    if (typeof value === "function") {
      const listener = value as EventListener;
      store[eventName] = listener;
      element.addEventListener(eventName, listener);
    }
    return;
  }

  if (value == null || value === false) {
    if (shouldSetAsProperty(element, name, value)) {
      try {
        (element as unknown as Record<string, unknown>)[name] = name === "value" ? "" : false;
      } catch {
        // ignore readonly property resets
      }
    }
    element.removeAttribute(name);
    return;
  }

  if (value === true) {
    element.setAttribute(name, "");
    if (shouldSetAsProperty(element, name, value)) {
      try {
        (element as unknown as Record<string, unknown>)[name] = true;
      } catch {
        // ignore readonly properties
      }
    }
    return;
  }

  if (shouldSetAsProperty(element, name, value)) {
    try {
      (element as unknown as Record<string, unknown>)[name] = value;
      if (name !== "value" && name !== "checked" && name !== "selected") {
        return;
      }
    } catch {
      // fall through to attribute
    }
  }

  element.setAttribute(name, String(value));
}

function patchProps(element: Element, prevProps: Record<string, unknown>, nextProps: Record<string, unknown>): void {
  const names = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);

  for (const name of names) {
    if (name === "children") continue;
    const prev = prevProps[name];
    const next = nextProps[name];
    if (typeof prev === "function" || typeof next === "function") {
      if (name.startsWith("on") || name === "ref") {
        patchDomProperty(element, name, next, prev);
      } else {
        patchDomProperty(element, name, typeof next === "function" ? (next as () => unknown)() : next, typeof prev === "function" ? (prev as () => unknown)() : prev);
      }
      continue;
    }
    if (prev !== next) {
      patchDomProperty(element, name, next, prev);
    }
  }
}

abstract class BaseInstance implements Instance {
  key: string | number | null;
  vnode: ResolvedVNode;
  parentDom: Node;
  contextMap: Map<symbol, unknown>;

  constructor(parentDom: Node, vnode: ResolvedVNode, contextMap: Map<symbol, unknown>) {
    this.parentDom = parentDom;
    this.vnode = vnode;
    this.key = vnode?.key ?? null;
    this.contextMap = contextMap;
  }

  abstract mount(before: Node | null): void;
  abstract update(nextVNode: ResolvedVNode): void;
  abstract unmount(): void;
  abstract firstNode(): Node | null;
  abstract nodes(): Node[];
}

class EmptyInstance extends BaseInstance {
  mount(): void {}
  override update(nextVNode: ResolvedVNode): void {
    this.vnode = nextVNode;
  }
  unmount(): void {}
  firstNode(): Node | null { return null; }
  nodes(): Node[] { return []; }
}

class TextInstance extends BaseInstance {
  node: Text;

  constructor(parentDom: Node, vnode: ResolvedVNode, contextMap: Map<symbol, unknown>) {
    super(parentDom, vnode, contextMap);
    this.node = document.createTextNode(String(vnode?.props.nodeValue ?? ""));
  }

  mount(before: Node | null): void { this.parentDom.insertBefore(this.node, before); }
  update(nextVNode: ResolvedVNode): void {
    this.vnode = nextVNode;
    this.node.nodeValue = String(nextVNode?.props.nodeValue ?? "");
  }
  unmount(): void { if (this.node.parentNode) this.node.parentNode.removeChild(this.node); }
  firstNode(): Node | null { return this.node; }
  nodes(): Node[] { return [this.node]; }
}

class NativeNodeInstance extends BaseInstance {
  node: Node;

  constructor(parentDom: Node, vnode: ResolvedVNode, contextMap: Map<symbol, unknown>) {
    super(parentDom, vnode, contextMap);
    this.node = vnode?.props.node as Node;
  }

  mount(before: Node | null): void { this.parentDom.insertBefore(this.node, before); }
  update(nextVNode: ResolvedVNode): void { this.vnode = nextVNode; this.node = nextVNode?.props.node as Node; }
  unmount(): void { if (this.node.parentNode) this.node.parentNode.removeChild(this.node); }
  firstNode(): Node | null { return this.node; }
  nodes(): Node[] { return [this.node]; }
}

class ElementInstance extends BaseInstance {
  element: Element;
  children: Instance[] = [];
  propWatchers = new Map<string, Cleanup>();

  constructor(parentDom: Node, vnode: ResolvedVNode, contextMap: Map<symbol, unknown>) {
    super(parentDom, vnode, contextMap);
    this.element = document.createElement(String(vnode?.type ?? "div"));
  }

  mount(before: Node | null): void {
    this.parentDom.insertBefore(this.element, before);
    this.applyProps({}, this.vnode?.props ?? {});
    this.children = reconcileChildren(this.element, [], toChildVNodes(this.vnode?.props.children), this.contextMap);
  }

  update(nextVNode: ResolvedVNode): void {
    const prevProps = this.vnode?.props ?? {};
    this.vnode = nextVNode;
    const nextProps = nextVNode?.props ?? {};
    this.applyProps(prevProps, nextProps);
    this.children = reconcileChildren(this.element, this.children, toChildVNodes(nextProps.children), this.contextMap);
  }

  private applyProps(prevProps: Record<string, unknown>, nextProps: Record<string, unknown>): void {
    const names = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);
    const nextRef = nextProps.ref as Ref<Element> | null | undefined;
    const prevRef = prevProps.ref as Ref<Element> | null | undefined;

    for (const name of names) {
      if (name === "children") continue;
      const prev = prevProps[name];
      const next = nextProps[name];

      if (name === "ref") {
        if (prevRef !== nextRef) {
          callRef(prevRef, null);
          callRef(nextRef, this.element);
        }
        continue;
      }

      if (!name.startsWith("on") && (typeof prev === "function" || typeof next === "function")) {
        this.propWatchers.get(name)?.();
        this.propWatchers.delete(name);
        if (typeof next === "function") {
          const read = next as () => unknown;
          const stop = watch(() => {
            patchDomProperty(this.element, name, read(), undefined);
          });
          this.propWatchers.set(name, stop);
        } else {
          patchDomProperty(this.element, name, next, prev);
        }
        continue;
      }

      if (prev !== next) {
        patchDomProperty(this.element, name, next, prev);
      }
    }
  }

  unmount(): void {
    for (const stop of this.propWatchers.values()) stop();
    this.propWatchers.clear();
    for (const child of this.children) child.unmount();
    this.children = [];
    callRef(this.vnode?.props.ref as Ref<Element> | null | undefined, null);
    if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
  }

  firstNode(): Node | null { return this.element; }
  nodes(): Node[] { return [this.element]; }
}

class FragmentInstance extends BaseInstance {
  start = document.createComment("warog-fragment-start");
  end = document.createComment("warog-fragment-end");
  children: Instance[] = [];

  mount(before: Node | null): void {
    this.parentDom.insertBefore(this.start, before);
    this.parentDom.insertBefore(this.end, before);
    this.children = reconcileChildrenBetween(this.parentDom, this.start, this.end, [], toChildVNodes(this.vnode?.props.children), this.contextMap);
  }

  update(nextVNode: ResolvedVNode): void {
    this.vnode = nextVNode;
    this.children = reconcileChildrenBetween(this.parentDom, this.start, this.end, this.children, toChildVNodes(nextVNode?.props.children), this.contextMap);
  }

  unmount(): void {
    for (const child of this.children) child.unmount();
    this.children = [];
    if (this.start.parentNode) this.start.parentNode.removeChild(this.start);
    if (this.end.parentNode) this.end.parentNode.removeChild(this.end);
  }

  firstNode(): Node | null { return this.start; }
  nodes(): Node[] { return [this.start, ...this.children.flatMap((child) => child.nodes()), this.end]; }
}

class DynamicInstance extends BaseInstance {
  start = document.createComment("warog-dynamic-start");
  end = document.createComment("warog-dynamic-end");
  child: Instance = new EmptyInstance(this.parentDom, null, this.contextMap);
  stop: Cleanup | null = null;

  mount(before: Node | null): void {
    this.parentDom.insertBefore(this.start, before);
    this.parentDom.insertBefore(this.end, before);
    const read = this.vnode?.props.read as (() => WarogChild);
    this.stop = watch(() => {
      const nextVNode = toVNode(read());
      this.child = reconcileSingleBetween(this.parentDom, this.start, this.end, this.child, nextVNode, this.contextMap);
    });
  }

  update(nextVNode: ResolvedVNode): void {
    this.vnode = nextVNode;
    this.stop?.();
    this.stop = null;
    this.child.unmount();
    this.child = new EmptyInstance(this.parentDom, null, this.contextMap);
    const read = nextVNode?.props.read as (() => WarogChild);
    this.stop = watch(() => {
      const resolved = toVNode(read());
      this.child = reconcileSingleBetween(this.parentDom, this.start, this.end, this.child, resolved, this.contextMap);
    });
  }

  unmount(): void {
    this.stop?.();
    this.stop = null;
    this.child.unmount();
    if (this.start.parentNode) this.start.parentNode.removeChild(this.start);
    if (this.end.parentNode) this.end.parentNode.removeChild(this.end);
  }

  firstNode(): Node | null { return this.start; }
  nodes(): Node[] { return [this.start, ...this.child.nodes(), this.end]; }
}

class RuntimeComponentInstance extends BaseInstance implements ComponentInstance {
  child: Instance;
  stop: Cleanup | null = null;
  renderFn: Component<Record<string, unknown>>;
  boundary: ErrorBoundaryInstance | null;

  constructor(parentDom: Node, vnode: ResolvedVNode, contextMap: Map<symbol, unknown>, boundary: ErrorBoundaryInstance | null) {
    super(parentDom, vnode, contextMap);
    this.renderFn = vnode?.type as Component<Record<string, unknown>>;
    this.child = new EmptyInstance(parentDom, null, contextMap);
    this.boundary = boundary;
  }

  mount(before: Node | null): void {
    this.runEffect(before);
  }

  update(nextVNode: ResolvedVNode): void {
    this.vnode = nextVNode;
    this.renderFn = nextVNode?.type as Component<Record<string, unknown>>;
    this.stop?.();
    this.stop = null;
    this.runEffect(this.child.firstNode());
  }

  private runEffect(before: Node | null): void {
    this.stop = watch(() => {
      const previous = currentComponent;
      currentComponent = this;
      try {
        const rendered = this.renderFn((this.vnode?.props ?? {}) as Record<string, unknown>);
        this.child = reconcileSingle(this.parentDom, this.child, toVNode(rendered), this.contextMap, before ?? null);
      } catch (error) {
        if (this.boundary) {
          this.boundary.capture(error);
          this.child = reconcileSingle(this.parentDom, this.child, null, this.contextMap, before ?? null);
        } else {
          throw error;
        }
      } finally {
        currentComponent = previous;
      }
    });
  }

  unmount(): void {
    this.stop?.();
    this.stop = null;
    this.child.unmount();
  }

  firstNode(): Node | null { return this.child.firstNode(); }
  nodes(): Node[] { return this.child.nodes(); }
}

class ProviderInstance extends RuntimeComponentInstance {
  constructor(parentDom: Node, vnode: ResolvedVNode, contextMap: Map<symbol, unknown>, boundary: ErrorBoundaryInstance | null) {
    const provider = vnode?.type as ProviderComponent<unknown>;
    const nextMap = new Map(contextMap);
    nextMap.set(provider._context.id, vnode?.props.value);
    super(parentDom, vnode, nextMap, boundary);
  }

  override update(nextVNode: ResolvedVNode): void {
    const provider = nextVNode?.type as ProviderComponent<unknown>;
    this.contextMap = new Map(this.contextMap);
    this.contextMap.set(provider._context.id, nextVNode?.props.value);
    super.update(nextVNode);
  }
}

class ErrorBoundaryInstance extends BaseInstance {
  child: Instance;
  error: unknown = null;

  constructor(parentDom: Node, vnode: ResolvedVNode, contextMap: Map<symbol, unknown>) {
    super(parentDom, vnode, contextMap);
    this.child = new EmptyInstance(parentDom, null, contextMap);
  }

  mount(before: Node | null): void {
    this.render(before);
  }

  update(nextVNode: ResolvedVNode): void {
    this.vnode = nextVNode;
    this.render(this.child.firstNode());
  }

  capture(error: unknown): void {
    this.error = error;
    (this.vnode?.props as unknown as ErrorBoundaryProps | undefined)?.onError?.(error);
    this.render(this.child.firstNode());
  }

  private render(before: Node | null): void {
    const props = this.vnode?.props as unknown as ErrorBoundaryProps;
    const fallback = typeof props.fallback === "function" ? (props.fallback as (error: unknown) => WarogChild)(this.error) : props.fallback;
    const next = this.error == null ? props.children ?? null : fallback;
    this.child = reconcileSingle(this.parentDom, this.child, toVNode(next), this.contextMap, before ?? null, this);
  }

  unmount(): void { this.child.unmount(); }
  firstNode(): Node | null { return this.child.firstNode(); }
  nodes(): Node[] { return this.child.nodes(); }
}

function NativeNode(props: { node: Node }): WarogChild { return props.node; }
function Dynamic(props: { read: () => WarogChild }): WarogChild { return props.read(); }

function createInstance(parentDom: Node, vnode: ResolvedVNode, contextMap: Map<symbol, unknown>, boundary: ErrorBoundaryInstance | null): Instance {
  if (vnode == null) return new EmptyInstance(parentDom, vnode, contextMap);
  if (vnode.type === TEXT_NODE) return new TextInstance(parentDom, vnode, contextMap);
  if (vnode.type === Fragment) return new FragmentInstance(parentDom, vnode, contextMap);
  if (vnode.type === ERROR_BOUNDARY_TYPE) return new ErrorBoundaryInstance(parentDom, vnode, contextMap);
  if (vnode.type === NativeNode) return new NativeNodeInstance(parentDom, vnode, contextMap);
  if (vnode.type === Dynamic) return new DynamicInstance(parentDom, vnode, contextMap);
  if (typeof vnode.type === "function") {
    const provider = vnode.type as Partial<ProviderComponent<unknown>>;
    if (provider.$$typeof === PROVIDER_TYPE) {
      return new ProviderInstance(parentDom, vnode, contextMap, boundary);
    }
    return new RuntimeComponentInstance(parentDom, vnode, contextMap, boundary);
  }
  return new ElementInstance(parentDom, vnode, contextMap);
}

function replaceInstance(parentDom: Node, current: Instance, nextVNode: ResolvedVNode, contextMap: Map<symbol, unknown>, before: Node | null, boundary: ErrorBoundaryInstance | null = null): Instance {
  const next = createInstance(parentDom, nextVNode, contextMap, boundary);
  next.mount(before);
  current.unmount();
  return next;
}

function reconcileSingle(parentDom: Node, current: Instance, nextVNode: ResolvedVNode, contextMap: Map<symbol, unknown>, before: Node | null = null, boundary: ErrorBoundaryInstance | null = null): Instance {
  if (current instanceof EmptyInstance && nextVNode == null) {
    return current;
  }
  if (nextVNode == null) {
    current.unmount();
    return new EmptyInstance(parentDom, null, contextMap);
  }
  if (current instanceof EmptyInstance) {
    const next = createInstance(parentDom, nextVNode, contextMap, boundary);
    next.mount(before);
    return next;
  }
  if (!sameType(current.vnode, nextVNode)) {
    return replaceInstance(parentDom, current, nextVNode, contextMap, before ?? current.firstNode(), boundary);
  }
  current.contextMap = contextMap;
  current.update(nextVNode);
  return current;
}

function reconcileSingleBetween(parentDom: Node, start: Node, end: Node, current: Instance, nextVNode: ResolvedVNode, contextMap: Map<symbol, unknown>): Instance {
  return reconcileSingle(parentDom, current, nextVNode, contextMap, end);
}

function toChildVNodes(children: WarogChild): ResolvedVNode[] {
  return toChildArray(children).map((child) => toVNode(child)).filter((value): value is WarogVNode => value != null);
}

function reconcileChildren(parentDom: Node, currentChildren: Instance[], nextChildren: ResolvedVNode[], contextMap: Map<symbol, unknown>): Instance[] {
  return reconcileChildrenInternal(parentDom, null, currentChildren, nextChildren, contextMap);
}

function reconcileChildrenBetween(parentDom: Node, _start: Node, end: Node, currentChildren: Instance[], nextChildren: ResolvedVNode[], contextMap: Map<symbol, unknown>): Instance[] {
  return reconcileChildrenInternal(parentDom, end, currentChildren, nextChildren, contextMap);
}

function reconcileChildrenInternal(parentDom: Node, boundaryNode: Node | null, currentChildren: Instance[], nextChildren: ResolvedVNode[], contextMap: Map<symbol, unknown>): Instance[] {
  const oldByKey = new Map<string | number, Instance>();
  currentChildren.forEach((child, index) => {
    oldByKey.set(child.key ?? `__index_${index}`, child);
  });

  const nextInstances: Instance[] = [];
  const used = new Set<Instance>();
  let anchor = boundaryNode;

  for (let index = nextChildren.length - 1; index >= 0; index -= 1) {
    const nextVNode = nextChildren[index]!;
    const key = getKey(nextVNode, index);
    const existing = oldByKey.get(key);
    let instance: Instance;
    if (existing && sameType(existing.vnode, nextVNode)) {
      existing.contextMap = contextMap;
      existing.update(nextVNode);
      const nodes = existing.nodes();
      if (nodes.length > 0) {
        moveNodes(parentDom, anchor, nodes);
      }
      instance = existing;
      used.add(existing);
    } else {
      instance = createInstance(parentDom, nextVNode, contextMap, null);
      instance.mount(anchor);
    }
    anchor = instance.firstNode();
    nextInstances.unshift(instance);
  }

  for (const old of currentChildren) {
    if (!used.has(old)) old.unmount();
  }

  return nextInstances;
}

class RenderRootImpl implements RenderRoot {
  instance: Instance;
  target: Element | DocumentFragment;
  contextMap = new Map<symbol, unknown>();
  options: RenderOptions;

  constructor(target: Element | DocumentFragment, child: WarogChild, options: RenderOptions = {}) {
    this.target = target;
    while (target.firstChild) {
      target.removeChild(target.firstChild);
    }
    this.instance = new EmptyInstance(target, null, this.contextMap);
    this.options = options;
    this.update(child);
  }

  update(next: WarogChild): void {
    this.instance = reconcileSingle(this.target, this.instance, toVNode(next), this.contextMap);
  }

  dispose(): void {
    this.instance.unmount();
    this.instance = new EmptyInstance(this.target, null, this.contextMap);
  }
}

export function mount(target: Element | DocumentFragment, child: WarogChild): Cleanup {
  const root = new RenderRootImpl(target, child);
  return () => root.dispose();
}

export function render(target: Element | DocumentFragment, child: WarogChild): Cleanup {
  const existing = roots.get(target);
  if (existing) {
    existing.update(child);
    return () => existing.dispose();
  }
  const root = new RenderRootImpl(target, child);
  roots.set(target, root);
  return () => {
    root.dispose();
    roots.delete(target);
  };
}

function reportHydrationMismatch(options: RenderOptions | undefined, code: HydrationMismatchCode, message: string): void {
  options?.onHydrationMismatch?.({ code, message });
}

interface HydrationShapeText {
  kind: "text";
  value: string;
}

interface HydrationShapeElement {
  kind: "element";
  tag: string;
  children: HydrationShapeNode[];
}

type HydrationShapeNode = HydrationShapeText | HydrationShapeElement;

function resolveHydrationShape(node: WarogChild): HydrationShapeNode[] {
  if (node == null || typeof node === "boolean") return [];
  if (Array.isArray(node)) return node.flatMap((child) => resolveHydrationShape(child));
  if (typeof node === "function") return resolveHydrationShape(node());
  if (typeof node === "string" || typeof node === "number") return [{ kind: "text", value: String(node) }];
  if (!isVNode(node)) return [];
  if (node.type === Fragment) return resolveHydrationShape(node.props.children);
  if (typeof node.type === "symbol") {
    if ((node.type as symbol) === ERROR_BOUNDARY_TYPE) {
      return resolveHydrationShape(((node.props as unknown) as ErrorBoundaryProps).children ?? null);
    }
    return [];
  }
  if (typeof node.type === "function") {
    const provider = node.type as Partial<ProviderComponent<unknown>>;
    if (provider.$$typeof === PROVIDER_TYPE) {
      return resolveHydrationShape(node.props.children);
    }
    return resolveHydrationShape((node.type as Component<Record<string, unknown>>)(node.props as Record<string, unknown>));
  }
  return [{ kind: "element", tag: String(node.type).toLowerCase(), children: resolveHydrationShape(node.props.children) }];
}

function compareHydrationShape(domNodes: Node[], expectedNodes: HydrationShapeNode[], options: RenderOptions | undefined, path = "root"): void {
  const max = Math.max(domNodes.length, expectedNodes.length);
  for (let index = 0; index < max; index += 1) {
    const existing = domNodes[index] ?? null;
    const expected = expectedNodes[index] ?? null;
    if (!existing && expected) {
      reportHydrationMismatch(options, "missing-node", `Hydration missing node at ${path}[${index}].`);
      continue;
    }
    if (existing && !expected) {
      reportHydrationMismatch(options, "missing-node", `Hydration extra DOM node at ${path}[${index}].`);
      continue;
    }
    if (!existing || !expected) continue;

    if (expected.kind === "text") {
      if (!isTextNode(existing)) {
        reportHydrationMismatch(options, "node-type-mismatch", `Expected text node at ${path}[${index}].`);
        continue;
      }
      if ((existing.nodeValue ?? "") !== expected.value) {
        reportHydrationMismatch(options, "text-mismatch", `Hydration text mismatch at ${path}[${index}]: expected "${expected.value}" but found "${existing.nodeValue ?? ""}".`);
      }
      continue;
    }

    if (!isElementNode(existing)) {
      reportHydrationMismatch(options, "node-type-mismatch", `Expected element <${expected.tag}> at ${path}[${index}].`);
      continue;
    }
    const actualTag = existing.tagName.toLowerCase();
    if (actualTag !== expected.tag) {
      reportHydrationMismatch(options, "tag-mismatch", `Hydration tag mismatch at ${path}[${index}]: expected <${expected.tag}> but found <${actualTag}>.`);
      continue;
    }
    compareHydrationShape(Array.from(existing.childNodes), expected.children, options, `${path}[${index}]<${expected.tag}>`);
  }
}

interface FormControlSnapshot {
  tag: string;
  type: string;
  value?: string;
  checked?: boolean;
  selected?: boolean;
}

function collectFormControlSnapshots(node: Node, acc: FormControlSnapshot[] = []): FormControlSnapshot[] {
  if (isElementNode(node)) {
    const tag = node.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || tag === "option") {
      const record = node as Element & { type?: string; value?: string; checked?: boolean; selected?: boolean };
      const snapshot: FormControlSnapshot = {
        tag,
        type: String(record.type ?? "")
      };
      if (typeof record.value === "string") snapshot.value = record.value;
      if (typeof record.checked === "boolean") snapshot.checked = record.checked;
      if (typeof record.selected === "boolean") snapshot.selected = record.selected;
      acc.push(snapshot);
    }
  }
  for (const child of Array.from(node.childNodes)) collectFormControlSnapshots(child, acc);
  return acc;
}

function restoreFormControlSnapshots(node: Node, snapshots: FormControlSnapshot[], cursor: { index: number }): void {
  if (isElementNode(node)) {
    const tag = node.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || tag === "option") {
      const snapshot = snapshots[cursor.index];
      cursor.index += 1;
      if (snapshot && snapshot.tag === tag) {
        const record = node as Element & { value?: string; checked?: boolean; selected?: boolean };
        if (snapshot.value !== undefined && "value" in record) record.value = snapshot.value;
        if (snapshot.checked !== undefined && "checked" in record) record.checked = snapshot.checked;
        if (snapshot.selected !== undefined && "selected" in record) record.selected = snapshot.selected;
      }
    }
  }
  for (const child of Array.from(node.childNodes)) restoreFormControlSnapshots(child, snapshots, cursor);
}

export function hydrate(target: Element | DocumentFragment, child: WarogChild, options?: RenderOptions): Cleanup {
  if (!target.firstChild) {
    reportHydrationMismatch(options, "missing-node", "Hydration target is empty; falling back to mount.");
  } else {
    compareHydrationShape(Array.from(target.childNodes), resolveHydrationShape(child), options);
  }
  const snapshots = collectFormControlSnapshots(target);
  const dispose = render(target, child);
  restoreFormControlSnapshots(target, snapshots, { index: 0 });
  return dispose;
}

export function jsx<P>(type: WarogVNode<P>["type"], props: P & { children?: WarogChild }, key?: string): WarogVNode<P> {
  return key === undefined ? { type, props } : { type, props, key };
}

export const jsxs = jsx;
export const jsxDEV = jsx;
