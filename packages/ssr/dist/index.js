import { Fragment } from '@warog/dom';
const ERROR_BOUNDARY_TYPE = Symbol.for('warog.error-boundary');
const PROVIDER_TYPE = Symbol.for('warog.context.provider');
const CLIENT_ONLY_TYPE = Symbol.for('warog.ssr.client-only');
const SERVER_ONLY_TYPE = Symbol.for('warog.ssr.server-only');
const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function isVNode(value) {
    return Boolean(value) && typeof value === 'object' && 'type' in value && 'props' in value;
}
function resolveValue(value) {
    return typeof value === 'function' ? value() : value;
}
function renderStyle(value) {
    const resolved = resolveValue(value);
    if (resolved == null)
        return null;
    if (typeof resolved === 'string')
        return resolved;
    return Object.entries(resolved)
        .filter(([, propertyValue]) => propertyValue != null)
        .map(([property, propertyValue]) => `${property}:${String(propertyValue)}`)
        .join(';');
}
function renderAttributes(props) {
    const attributes = [];
    for (const [name, rawValue] of Object.entries(props)) {
        if (name === 'children' || name === 'ref' || name === 'key' || name.startsWith('on')) {
            continue;
        }
        if (name === 'className' || name === 'class') {
            const value = resolveValue(rawValue);
            if (value != null && value !== false) {
                attributes.push(`class="${escapeHtml(String(value))}"`);
            }
            continue;
        }
        if (name === 'style') {
            const styleValue = renderStyle(rawValue);
            if (styleValue) {
                attributes.push(`style="${escapeHtml(styleValue)}"`);
            }
            continue;
        }
        const value = resolveValue(rawValue);
        if (value == null || value === false) {
            continue;
        }
        if (value === true) {
            attributes.push(name);
            continue;
        }
        attributes.push(`${name}="${escapeHtml(String(value))}"`);
    }
    return attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
}
function renderNode(node, options) {
    if (node == null || typeof node === 'boolean') {
        return '';
    }
    if (Array.isArray(node)) {
        return node.map((child) => renderNode(child, options)).join('');
    }
    if (typeof node === 'function') {
        return renderNode(node(), options);
    }
    if (typeof node === 'string' || typeof node === 'number') {
        return escapeHtml(String(node));
    }
    if (!isVNode(node)) {
        return '';
    }
    if (node.type === Fragment) {
        return renderNode(node.props.children, options);
    }
    if (typeof node.type === 'symbol' && node.type === ERROR_BOUNDARY_TYPE) {
        const props = node.props;
        try {
            return renderNode(props.children ?? null, options);
        }
        catch (error) {
            options.onError?.(error);
            props.onError?.(error);
            const fallback = typeof props.fallback === 'function' ? props.fallback(error) : props.fallback;
            return renderNode(fallback, options);
        }
    }
    if (typeof node.type === 'function') {
        const fn = node.type;
        if (fn.$$typeof === PROVIDER_TYPE) {
            return renderNode(node.props.children, options);
        }
        if (fn.$$typeof === CLIENT_ONLY_TYPE) {
            const props = node.props;
            const fallback = props.fallback ?? fn.__fallback ?? null;
            const marker = props.marker ?? fn.__marker ?? fn.displayName ?? 'component';
            const renderedFallback = renderNode(fallback, options);
            return `<!--warog-client-only:${escapeHtml(marker)}-->${renderedFallback}`;
        }
        if (fn.$$typeof === SERVER_ONLY_TYPE) {
            return renderNode(fn(node.props), options);
        }
        try {
            return renderNode(fn(node.props), options);
        }
        catch (error) {
            options.onError?.(error);
            throw error;
        }
    }
    const tag = String(node.type);
    const attributes = renderAttributes(node.props);
    const children = renderNode(node.props.children, options);
    if (VOID_TAGS.has(tag)) {
        return `<${tag}${attributes}>`;
    }
    return `<${tag}${attributes}>${children}</${tag}>`;
}
export function renderToString(node, options = {}) {
    return renderNode(node, options);
}
export function renderToStream(node, options = {}) {
    const html = renderToString(node, options);
    return {
        async *[Symbol.asyncIterator]() {
            const midpoint = Math.max(1, Math.ceil(html.length / 2));
            yield html.slice(0, midpoint);
            if (midpoint < html.length) {
                yield html.slice(midpoint);
            }
        }
    };
}
export function createClientOnly(component, fallback = null, marker) {
    const wrapped = ((props) => {
        if (typeof document === 'undefined') {
            return { type: wrapped, props: { ...props, fallback, marker } };
        }
        return component(props);
    });
    wrapped.$$typeof = CLIENT_ONLY_TYPE;
    wrapped.displayName = marker ?? component.name ?? 'ClientOnly';
    wrapped.__fallback = fallback;
    wrapped.__marker = marker ?? component.name ?? 'ClientOnly';
    return wrapped;
}
export function createServerOnly(component, fallback = null) {
    const wrapped = ((props) => {
        if (typeof document === 'undefined') {
            return component(props);
        }
        return fallback;
    });
    wrapped.$$typeof = SERVER_ONLY_TYPE;
    wrapped.displayName = component.name ?? 'ServerOnly';
    return wrapped;
}
//# sourceMappingURL=index.js.map