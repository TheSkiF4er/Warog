import { signal } from '@warog/core';
function normalizePath(path) {
    if (!path)
        return '/';
    const [pathname] = path.split(/[?#]/, 1);
    if (!pathname)
        return '/';
    const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}
function splitSegments(path) {
    const normalized = normalizePath(path);
    return normalized === '/' ? [] : normalized.slice(1).split('/');
}
export function matchRoute(pathname, routes) {
    const pathSegments = splitSegments(pathname);
    for (const route of routes) {
        const routeSegments = splitSegments(route.path);
        if (routeSegments.length !== pathSegments.length) {
            continue;
        }
        const params = {};
        let matched = true;
        for (let i = 0; i < routeSegments.length; i += 1) {
            const routeSegment = routeSegments[i];
            const pathSegment = pathSegments[i];
            if (routeSegment.startsWith(':')) {
                params[routeSegment.slice(1)] = decodeURIComponent(pathSegment);
                continue;
            }
            if (routeSegment !== pathSegment) {
                matched = false;
                break;
            }
        }
        if (matched) {
            return {
                path: normalizePath(pathname),
                params,
                component: route.component
            };
        }
    }
    return null;
}
function createLinkVNode(props, onClick) {
    const vnodeProps = {
        href: props.to,
        onClick,
        children: props.children
    };
    if (props.class != null) {
        vnodeProps.class = props.class;
    }
    if (props.className != null) {
        vnodeProps.className = props.className;
    }
    return {
        type: 'a',
        props: vnodeProps
    };
}
export function createMemoryRouter(routes, initialPath = '/') {
    const path = signal(normalizePath(initialPath));
    const current = signal(matchRoute(path.peek(), routes));
    const sync = () => {
        current.set(matchRoute(path.peek(), routes));
    };
    const setPath = (to) => {
        path.set(normalizePath(to));
        sync();
    };
    const navigate = (to) => {
        setPath(to);
    };
    const start = () => () => { };
    const Link = (props) => createLinkVNode(props, (event) => {
        event.preventDefault();
        navigate(props.to);
    });
    const Outlet = () => () => {
        const match = current.get();
        if (!match) {
            return null;
        }
        return match.component({ params: match.params });
    };
    return { path, current, navigate, start, Link, Outlet };
}
export function createBrowserRouter(routes, targetWindow = window) {
    const router = createMemoryRouter(routes, targetWindow.location.pathname);
    const syncFromWindow = () => {
        router.navigate(targetWindow.location.pathname);
    };
    const navigate = (to, options) => {
        const next = normalizePath(to);
        if (options?.replace) {
            targetWindow.history.replaceState(null, '', next);
        }
        else {
            targetWindow.history.pushState(null, '', next);
        }
        router.navigate(next);
    };
    const start = () => {
        const onPopState = () => syncFromWindow();
        targetWindow.addEventListener('popstate', onPopState);
        syncFromWindow();
        return () => targetWindow.removeEventListener('popstate', onPopState);
    };
    const Link = (props) => createLinkVNode(props, (event) => {
        event.preventDefault();
        navigate(props.to, props.replace ? { replace: true } : undefined);
    });
    return {
        path: router.path,
        current: router.current,
        navigate,
        start,
        Link,
        Outlet: router.Outlet
    };
}
//# sourceMappingURL=index.js.map