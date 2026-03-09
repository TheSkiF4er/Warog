import { type ReadonlySignal, type Cleanup } from '@warog/core';
import type { Component, WarogChild } from '@warog/dom';
export interface RouteDefinition {
    path: string;
    component: Component<{
        params: Record<string, string>;
    }>;
}
export interface RouteMatch {
    path: string;
    params: Record<string, string>;
    component: Component<{
        params: Record<string, string>;
    }>;
}
export interface BrowserRouter {
    readonly path: ReadonlySignal<string>;
    readonly current: ReadonlySignal<RouteMatch | null>;
    navigate(to: string, options?: {
        replace?: boolean;
    }): void;
    start(): Cleanup;
    Link: Component<{
        to: string;
        replace?: boolean;
        class?: string | null;
        className?: string | null;
        children?: WarogChild;
    }>;
    Outlet: Component<Record<string, never>>;
}
export declare function matchRoute(pathname: string, routes: RouteDefinition[]): RouteMatch | null;
export declare function createMemoryRouter(routes: RouteDefinition[], initialPath?: string): BrowserRouter;
export declare function createBrowserRouter(routes: RouteDefinition[], targetWindow?: Window): BrowserRouter;
//# sourceMappingURL=index.d.ts.map