import { watch } from "@warog/core";
export const Fragment = Symbol.for("warog.fragment");
const TEXT_NODE = Symbol.for("warog.text");
const PROVIDER_TYPE = Symbol.for("warog.context.provider");
const ERROR_BOUNDARY_TYPE = Symbol.for("warog.error-boundary");
let currentComponent = null;
const roots = new WeakMap();
function isNode(value) {
    return Boolean(value) && typeof value === "object" && "nodeType" in value;
}
function isElementNode(node) {
    return node != null && node.nodeType === 1;
}
function isTextNode(node) {
    return node != null && node.nodeType === 3;
}
function isVNode(value) {
    return Boolean(value) && typeof value === "object" && "type" in value && "props" in value;
}
function sameType(a, b) {
    if (!a || !b)
        return false;
    return a.type === b.type && a.key === b.key;
}
function createRef() {
    return { current: null };
}
export { createRef };
export function createContext(defaultValue) {
    const context = {
        id: Symbol("warog.context"),
        defaultValue,
        Provider: Object.assign(((props) => props.children ?? null), {
            $$typeof: PROVIDER_TYPE,
            _context: undefined
        })
    };
    context.Provider._context = context;
    return context;
}
export function useContext(context) {
    if (!currentComponent) {
        return context.defaultValue;
    }
    if (currentComponent.contextMap.has(context.id)) {
        return currentComponent.contextMap.get(context.id);
    }
    return context.defaultValue;
}
export function ErrorBoundary(props) {
    return { type: ERROR_BOUNDARY_TYPE, props };
}
function normalizeChildren(children) {
    if (Array.isArray(children)) {
        return children.flatMap((child) => normalizeChildren(child));
    }
    return [children];
}
function toChildArray(children) {
    return normalizeChildren(children).filter((child) => child != null && child !== false && child !== true);
}
function toVNode(child) {
    if (child == null || typeof child === "boolean")
        return null;
    if (Array.isArray(child))
        return { type: Fragment, props: { children: child } };
    if (typeof child === "string" || typeof child === "number") {
        return { type: TEXT_NODE, props: { nodeValue: String(child) } };
    }
    if (typeof child === "function") {
        return { type: Dynamic, props: { read: child } };
    }
    if (isVNode(child))
        return child;
    if (isNode(child)) {
        return { type: NativeNode, props: { node: child } };
    }
    return { type: TEXT_NODE, props: { nodeValue: String(child) } };
}
function getKey(vnode, index) {
    return vnode?.key ?? `__index_${index}`;
}
function callRef(ref, value) {
    if (!ref)
        return;
    if (typeof ref === "function") {
        ref(value);
        return;
    }
    ref.current = value;
}
function insertRange(parent, before, nodes) {
    for (const node of nodes) {
        parent.insertBefore(node, before);
    }
}
function removeNodes(nodes) {
    for (const node of nodes) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
}
function moveNodes(parent, before, nodes) {
    insertRange(parent, before, nodes);
}
function setClass(element, value) {
    if (value == null || value === false) {
        element.removeAttribute("class");
        return;
    }
    element.setAttribute("class", String(value));
}
function setStyle(target, value, previous) {
    if (!("style" in target)) {
        if (value == null)
            target.removeAttribute("style");
        else
            target.setAttribute("style", typeof value === "string" ? value : Object.entries(value).filter(([, v]) => v != null).map(([k, v]) => `${k}:${String(v)}`).join(";"));
        return;
    }
    const style = target.style;
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
    }
    else {
        style.cssText = "";
    }
    for (const [property, propertyValue] of Object.entries(value)) {
        if (propertyValue == null)
            style.removeProperty(property);
        else
            style.setProperty(property, String(propertyValue));
    }
}
function shouldSetAsProperty(element, name, value) {
    if (name === "value" || name === "checked" || name === "selected" || name === "muted" || name === "disabled")
        return true;
    return name in element && typeof value !== "string";
}
function patchDomProperty(element, name, value, previous) {
    if (name === "class" || name === "className") {
        setClass(element, value);
        return;
    }
    if (name === "style") {
        setStyle(element, value, previous);
        return;
    }
    if (name === "ref" || name === "children" || name === "key") {
        return;
    }
    if (name.startsWith("on")) {
        const store = (element.__warogEvents ??= {});
        const eventName = name.slice(2).toLowerCase();
        const prior = store[eventName];
        if (prior) {
            element.removeEventListener(eventName, prior);
            delete store[eventName];
        }
        if (typeof value === "function") {
            const listener = value;
            store[eventName] = listener;
            element.addEventListener(eventName, listener);
        }
        return;
    }
    if (value == null || value === false) {
        if (shouldSetAsProperty(element, name, value)) {
            try {
                element[name] = name === "value" ? "" : false;
            }
            catch {
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
                element[name] = true;
            }
            catch {
                // ignore readonly properties
            }
        }
        return;
    }
    if (shouldSetAsProperty(element, name, value)) {
        try {
            element[name] = value;
            if (name !== "value" && name !== "checked" && name !== "selected") {
                return;
            }
        }
        catch {
            // fall through to attribute
        }
    }
    element.setAttribute(name, String(value));
}
function patchProps(element, prevProps, nextProps) {
    const names = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);
    for (const name of names) {
        if (name === "children")
            continue;
        const prev = prevProps[name];
        const next = nextProps[name];
        if (typeof prev === "function" || typeof next === "function") {
            if (name.startsWith("on") || name === "ref") {
                patchDomProperty(element, name, next, prev);
            }
            else {
                patchDomProperty(element, name, typeof next === "function" ? next() : next, typeof prev === "function" ? prev() : prev);
            }
            continue;
        }
        if (prev !== next) {
            patchDomProperty(element, name, next, prev);
        }
    }
}
class BaseInstance {
    key;
    vnode;
    parentDom;
    contextMap;
    constructor(parentDom, vnode, contextMap) {
        this.parentDom = parentDom;
        this.vnode = vnode;
        this.key = vnode?.key ?? null;
        this.contextMap = contextMap;
    }
}
class EmptyInstance extends BaseInstance {
    mount() { }
    update(nextVNode) {
        this.vnode = nextVNode;
    }
    unmount() { }
    firstNode() { return null; }
    nodes() { return []; }
}
class TextInstance extends BaseInstance {
    node;
    constructor(parentDom, vnode, contextMap) {
        super(parentDom, vnode, contextMap);
        this.node = document.createTextNode(String(vnode?.props.nodeValue ?? ""));
    }
    mount(before) { this.parentDom.insertBefore(this.node, before); }
    update(nextVNode) {
        this.vnode = nextVNode;
        this.node.nodeValue = String(nextVNode?.props.nodeValue ?? "");
    }
    unmount() { if (this.node.parentNode)
        this.node.parentNode.removeChild(this.node); }
    firstNode() { return this.node; }
    nodes() { return [this.node]; }
}
class NativeNodeInstance extends BaseInstance {
    node;
    constructor(parentDom, vnode, contextMap) {
        super(parentDom, vnode, contextMap);
        this.node = vnode?.props.node;
    }
    mount(before) { this.parentDom.insertBefore(this.node, before); }
    update(nextVNode) { this.vnode = nextVNode; this.node = nextVNode?.props.node; }
    unmount() { if (this.node.parentNode)
        this.node.parentNode.removeChild(this.node); }
    firstNode() { return this.node; }
    nodes() { return [this.node]; }
}
class ElementInstance extends BaseInstance {
    element;
    children = [];
    propWatchers = new Map();
    constructor(parentDom, vnode, contextMap) {
        super(parentDom, vnode, contextMap);
        this.element = document.createElement(String(vnode?.type ?? "div"));
    }
    mount(before) {
        this.parentDom.insertBefore(this.element, before);
        this.applyProps({}, this.vnode?.props ?? {});
        this.children = reconcileChildren(this.element, [], toChildVNodes(this.vnode?.props.children), this.contextMap);
    }
    update(nextVNode) {
        const prevProps = this.vnode?.props ?? {};
        this.vnode = nextVNode;
        const nextProps = nextVNode?.props ?? {};
        this.applyProps(prevProps, nextProps);
        this.children = reconcileChildren(this.element, this.children, toChildVNodes(nextProps.children), this.contextMap);
    }
    applyProps(prevProps, nextProps) {
        const names = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);
        const nextRef = nextProps.ref;
        const prevRef = prevProps.ref;
        for (const name of names) {
            if (name === "children")
                continue;
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
                    const read = next;
                    const stop = watch(() => {
                        patchDomProperty(this.element, name, read(), undefined);
                    });
                    this.propWatchers.set(name, stop);
                }
                else {
                    patchDomProperty(this.element, name, next, prev);
                }
                continue;
            }
            if (prev !== next) {
                patchDomProperty(this.element, name, next, prev);
            }
        }
    }
    unmount() {
        for (const stop of this.propWatchers.values())
            stop();
        this.propWatchers.clear();
        for (const child of this.children)
            child.unmount();
        this.children = [];
        callRef(this.vnode?.props.ref, null);
        if (this.element.parentNode)
            this.element.parentNode.removeChild(this.element);
    }
    firstNode() { return this.element; }
    nodes() { return [this.element]; }
}
class FragmentInstance extends BaseInstance {
    start = document.createComment("warog-fragment-start");
    end = document.createComment("warog-fragment-end");
    children = [];
    mount(before) {
        this.parentDom.insertBefore(this.start, before);
        this.parentDom.insertBefore(this.end, before);
        this.children = reconcileChildrenBetween(this.parentDom, this.start, this.end, [], toChildVNodes(this.vnode?.props.children), this.contextMap);
    }
    update(nextVNode) {
        this.vnode = nextVNode;
        this.children = reconcileChildrenBetween(this.parentDom, this.start, this.end, this.children, toChildVNodes(nextVNode?.props.children), this.contextMap);
    }
    unmount() {
        for (const child of this.children)
            child.unmount();
        this.children = [];
        if (this.start.parentNode)
            this.start.parentNode.removeChild(this.start);
        if (this.end.parentNode)
            this.end.parentNode.removeChild(this.end);
    }
    firstNode() { return this.start; }
    nodes() { return [this.start, ...this.children.flatMap((child) => child.nodes()), this.end]; }
}
class DynamicInstance extends BaseInstance {
    start = document.createComment("warog-dynamic-start");
    end = document.createComment("warog-dynamic-end");
    child = new EmptyInstance(this.parentDom, null, this.contextMap);
    stop = null;
    mount(before) {
        this.parentDom.insertBefore(this.start, before);
        this.parentDom.insertBefore(this.end, before);
        const read = this.vnode?.props.read;
        this.stop = watch(() => {
            const nextVNode = toVNode(read());
            this.child = reconcileSingleBetween(this.parentDom, this.start, this.end, this.child, nextVNode, this.contextMap);
        });
    }
    update(nextVNode) {
        this.vnode = nextVNode;
        this.stop?.();
        this.stop = null;
        this.child.unmount();
        this.child = new EmptyInstance(this.parentDom, null, this.contextMap);
        const read = nextVNode?.props.read;
        this.stop = watch(() => {
            const resolved = toVNode(read());
            this.child = reconcileSingleBetween(this.parentDom, this.start, this.end, this.child, resolved, this.contextMap);
        });
    }
    unmount() {
        this.stop?.();
        this.stop = null;
        this.child.unmount();
        if (this.start.parentNode)
            this.start.parentNode.removeChild(this.start);
        if (this.end.parentNode)
            this.end.parentNode.removeChild(this.end);
    }
    firstNode() { return this.start; }
    nodes() { return [this.start, ...this.child.nodes(), this.end]; }
}
class RuntimeComponentInstance extends BaseInstance {
    child;
    stop = null;
    renderFn;
    boundary;
    constructor(parentDom, vnode, contextMap, boundary) {
        super(parentDom, vnode, contextMap);
        this.renderFn = vnode?.type;
        this.child = new EmptyInstance(parentDom, null, contextMap);
        this.boundary = boundary;
    }
    mount(before) {
        this.runEffect(before);
    }
    update(nextVNode) {
        this.vnode = nextVNode;
        this.renderFn = nextVNode?.type;
        this.stop?.();
        this.stop = null;
        this.runEffect(this.child.firstNode());
    }
    runEffect(before) {
        this.stop = watch(() => {
            const previous = currentComponent;
            currentComponent = this;
            try {
                const rendered = this.renderFn((this.vnode?.props ?? {}));
                this.child = reconcileSingle(this.parentDom, this.child, toVNode(rendered), this.contextMap, before ?? null);
            }
            catch (error) {
                if (this.boundary) {
                    this.boundary.capture(error);
                    this.child = reconcileSingle(this.parentDom, this.child, null, this.contextMap, before ?? null);
                }
                else {
                    throw error;
                }
            }
            finally {
                currentComponent = previous;
            }
        });
    }
    unmount() {
        this.stop?.();
        this.stop = null;
        this.child.unmount();
    }
    firstNode() { return this.child.firstNode(); }
    nodes() { return this.child.nodes(); }
}
class ProviderInstance extends RuntimeComponentInstance {
    constructor(parentDom, vnode, contextMap, boundary) {
        const provider = vnode?.type;
        const nextMap = new Map(contextMap);
        nextMap.set(provider._context.id, vnode?.props.value);
        super(parentDom, vnode, nextMap, boundary);
    }
    update(nextVNode) {
        const provider = nextVNode?.type;
        this.contextMap = new Map(this.contextMap);
        this.contextMap.set(provider._context.id, nextVNode?.props.value);
        super.update(nextVNode);
    }
}
class ErrorBoundaryInstance extends BaseInstance {
    child;
    error = null;
    constructor(parentDom, vnode, contextMap) {
        super(parentDom, vnode, contextMap);
        this.child = new EmptyInstance(parentDom, null, contextMap);
    }
    mount(before) {
        this.render(before);
    }
    update(nextVNode) {
        this.vnode = nextVNode;
        this.render(this.child.firstNode());
    }
    capture(error) {
        this.error = error;
        this.vnode?.props?.onError?.(error);
        this.render(this.child.firstNode());
    }
    render(before) {
        const props = this.vnode?.props;
        const fallback = typeof props.fallback === "function" ? props.fallback(this.error) : props.fallback;
        const next = this.error == null ? props.children ?? null : fallback;
        this.child = reconcileSingle(this.parentDom, this.child, toVNode(next), this.contextMap, before ?? null, this);
    }
    unmount() { this.child.unmount(); }
    firstNode() { return this.child.firstNode(); }
    nodes() { return this.child.nodes(); }
}
function NativeNode(props) { return props.node; }
function Dynamic(props) { return props.read(); }
function createInstance(parentDom, vnode, contextMap, boundary) {
    if (vnode == null)
        return new EmptyInstance(parentDom, vnode, contextMap);
    if (vnode.type === TEXT_NODE)
        return new TextInstance(parentDom, vnode, contextMap);
    if (vnode.type === Fragment)
        return new FragmentInstance(parentDom, vnode, contextMap);
    if (vnode.type === ERROR_BOUNDARY_TYPE)
        return new ErrorBoundaryInstance(parentDom, vnode, contextMap);
    if (vnode.type === NativeNode)
        return new NativeNodeInstance(parentDom, vnode, contextMap);
    if (vnode.type === Dynamic)
        return new DynamicInstance(parentDom, vnode, contextMap);
    if (typeof vnode.type === "function") {
        const provider = vnode.type;
        if (provider.$$typeof === PROVIDER_TYPE) {
            return new ProviderInstance(parentDom, vnode, contextMap, boundary);
        }
        return new RuntimeComponentInstance(parentDom, vnode, contextMap, boundary);
    }
    return new ElementInstance(parentDom, vnode, contextMap);
}
function replaceInstance(parentDom, current, nextVNode, contextMap, before, boundary = null) {
    const next = createInstance(parentDom, nextVNode, contextMap, boundary);
    next.mount(before);
    current.unmount();
    return next;
}
function reconcileSingle(parentDom, current, nextVNode, contextMap, before = null, boundary = null) {
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
function reconcileSingleBetween(parentDom, start, end, current, nextVNode, contextMap) {
    return reconcileSingle(parentDom, current, nextVNode, contextMap, end);
}
function toChildVNodes(children) {
    return toChildArray(children).map((child) => toVNode(child)).filter((value) => value != null);
}
function reconcileChildren(parentDom, currentChildren, nextChildren, contextMap) {
    return reconcileChildrenInternal(parentDom, null, currentChildren, nextChildren, contextMap);
}
function reconcileChildrenBetween(parentDom, _start, end, currentChildren, nextChildren, contextMap) {
    return reconcileChildrenInternal(parentDom, end, currentChildren, nextChildren, contextMap);
}
function reconcileChildrenInternal(parentDom, boundaryNode, currentChildren, nextChildren, contextMap) {
    const oldByKey = new Map();
    currentChildren.forEach((child, index) => {
        oldByKey.set(child.key ?? `__index_${index}`, child);
    });
    const nextInstances = [];
    const used = new Set();
    let anchor = boundaryNode;
    for (let index = nextChildren.length - 1; index >= 0; index -= 1) {
        const nextVNode = nextChildren[index];
        const key = getKey(nextVNode, index);
        const existing = oldByKey.get(key);
        let instance;
        if (existing && sameType(existing.vnode, nextVNode)) {
            existing.contextMap = contextMap;
            existing.update(nextVNode);
            const nodes = existing.nodes();
            if (nodes.length > 0) {
                moveNodes(parentDom, anchor, nodes);
            }
            instance = existing;
            used.add(existing);
        }
        else {
            instance = createInstance(parentDom, nextVNode, contextMap, null);
            instance.mount(anchor);
        }
        anchor = instance.firstNode();
        nextInstances.unshift(instance);
    }
    for (const old of currentChildren) {
        if (!used.has(old))
            old.unmount();
    }
    return nextInstances;
}
class RenderRootImpl {
    instance;
    target;
    contextMap = new Map();
    options;
    constructor(target, child, options = {}) {
        this.target = target;
        while (target.firstChild) {
            target.removeChild(target.firstChild);
        }
        this.instance = new EmptyInstance(target, null, this.contextMap);
        this.options = options;
        this.update(child);
    }
    update(next) {
        this.instance = reconcileSingle(this.target, this.instance, toVNode(next), this.contextMap);
    }
    dispose() {
        this.instance.unmount();
        this.instance = new EmptyInstance(this.target, null, this.contextMap);
    }
}
export function mount(target, child) {
    const root = new RenderRootImpl(target, child);
    return () => root.dispose();
}
export function render(target, child) {
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
function reportHydrationMismatch(options, code, message) {
    options?.onHydrationMismatch?.({ code, message });
}
export function hydrate(target, child, options) {
    const expected = toVNode(child);
    const existing = target.firstChild;
    if (!existing) {
        reportHydrationMismatch(options, "missing-node", "Hydration target is empty; falling back to mount.");
    }
    else if (expected?.type === TEXT_NODE && !isTextNode(existing)) {
        reportHydrationMismatch(options, "node-type-mismatch", "Expected text node during hydration.");
    }
    else if (expected?.type === TEXT_NODE && isTextNode(existing) && existing.nodeValue !== String(expected.props.nodeValue)) {
        reportHydrationMismatch(options, "text-mismatch", `Hydration text mismatch: expected \"${String(expected.props.nodeValue)}\".`);
    }
    else if (expected && typeof expected.type === "string" && isElementNode(existing) && existing.tagName.toLowerCase() !== String(expected.type).toLowerCase()) {
        reportHydrationMismatch(options, "tag-mismatch", `Hydration tag mismatch: expected <${String(expected.type)}> but found <${existing.tagName.toLowerCase()}>.`);
    }
    return render(target, child);
}
export function jsx(type, props, key) {
    return key === undefined ? { type, props } : { type, props, key };
}
export const jsxs = jsx;
export const jsxDEV = jsx;
//# sourceMappingURL=index.js.map