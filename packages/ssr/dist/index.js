import { Fragment } from '@warog/dom';
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
function renderStyle(value) {
    const resolved = typeof value === 'function' ? value() : value;
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
        if (name === 'children' || name === 'ref' || name.startsWith('on')) {
            continue;
        }
        if (name === 'className' || name === 'class') {
            const value = typeof rawValue === 'function' ? rawValue() : rawValue;
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
        const value = typeof rawValue === 'function' ? rawValue() : rawValue;
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
export function renderToString(node) {
    if (node == null || typeof node === 'boolean') {
        return '';
    }
    if (Array.isArray(node)) {
        return node.map((child) => renderToString(child)).join('');
    }
    if (typeof node === 'function') {
        return renderToString(node());
    }
    if (typeof node === 'string' || typeof node === 'number') {
        return escapeHtml(String(node));
    }
    if (isVNode(node)) {
        if (node.type === Fragment) {
            return renderToString(node.props.children);
        }
        if (typeof node.type === 'function') {
            return renderToString(node.type(node.props));
        }
        const tag = node.type;
        const attributes = renderAttributes(node.props);
        const children = renderToString(node.props.children);
        return `<${tag}${attributes}>${children}</${tag}>`;
    }
    return '';
}
//# sourceMappingURL=index.js.map