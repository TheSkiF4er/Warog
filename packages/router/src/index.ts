import { signal, type ReadonlySignal, type Signal, type Cleanup } from '@warog/core';
import type { Component, WarogChild } from '@warog/dom';

export interface RouteDefinition {
  path: string;
  component: Component<{ params: Record<string, string> }>;
}

export interface RouteMatch {
  path: string;
  params: Record<string, string>;
  component: Component<{ params: Record<string, string> }>;
}

export interface BrowserRouter {
  readonly path: ReadonlySignal<string>;
  readonly current: ReadonlySignal<RouteMatch | null>;
  navigate(to: string, options?: { replace?: boolean }): void;
  start(): Cleanup;
  Link: Component<{ to: string; replace?: boolean; class?: string | null; className?: string | null; children?: WarogChild }>;
  Outlet: Component<Record<string, never>>;
}

function normalizePath(path: string): string {
  if (!path) return '/';
  const [pathname] = path.split(/[?#]/, 1);
  if (!pathname) return '/';
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function splitSegments(path: string): string[] {
  const normalized = normalizePath(path);
  return normalized === '/' ? [] : normalized.slice(1).split('/');
}

export function matchRoute(pathname: string, routes: RouteDefinition[]): RouteMatch | null {
  const pathSegments = splitSegments(pathname);

  for (const route of routes) {
    const routeSegments = splitSegments(route.path);
    if (routeSegments.length !== pathSegments.length) {
      continue;
    }

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < routeSegments.length; i += 1) {
      const routeSegment = routeSegments[i]!;
      const pathSegment = pathSegments[i]!;

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

function createLinkVNode(props: { to: string; class?: string | null; className?: string | null; children?: WarogChild }, onClick: (event: MouseEvent) => void) {
  const vnodeProps: Record<string, unknown> = {
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
    type: 'a' as const,
    props: vnodeProps
  };
}

export function createMemoryRouter(routes: RouteDefinition[], initialPath = '/'): BrowserRouter {
  const path: Signal<string> = signal(normalizePath(initialPath));
  const current: Signal<RouteMatch | null> = signal(matchRoute(path.peek(), routes));

  const sync = (): void => {
    current.set(matchRoute(path.peek(), routes));
  };

  const setPath = (to: string): void => {
    path.set(normalizePath(to));
    sync();
  };

  const navigate = (to: string): void => {
    setPath(to);
  };

  const start = (): Cleanup => () => {};

  const Link: BrowserRouter['Link'] = (props) => createLinkVNode(props, (event) => {
    event.preventDefault();
    navigate(props.to);
  });

  const Outlet: BrowserRouter['Outlet'] = () => () => {
    const match = current.get();
    if (!match) {
      return null;
    }
    return match.component({ params: match.params });
  };

  return { path, current, navigate, start, Link, Outlet };
}

export function createBrowserRouter(routes: RouteDefinition[], targetWindow: Window = window): BrowserRouter {
  const router = createMemoryRouter(routes, targetWindow.location.pathname);

  const syncFromWindow = (): void => {
    router.navigate(targetWindow.location.pathname);
  };

  const navigate = (to: string, options?: { replace?: boolean }): void => {
    const next = normalizePath(to);
    if (options?.replace) {
      targetWindow.history.replaceState(null, '', next);
    } else {
      targetWindow.history.pushState(null, '', next);
    }
    router.navigate(next);
  };

  const start = (): Cleanup => {
    const onPopState = (): void => syncFromWindow();
    targetWindow.addEventListener('popstate', onPopState);
    syncFromWindow();
    return () => targetWindow.removeEventListener('popstate', onPopState);
  };

  const Link: BrowserRouter['Link'] = (props) => createLinkVNode(props, (event) => {
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
