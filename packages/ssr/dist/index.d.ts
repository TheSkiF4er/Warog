import { type Component, type WarogChild } from '@warog/dom';
export interface SsrRenderOptions {
    onError?: (error: unknown) => void;
}
export interface SsrStream {
    [Symbol.asyncIterator](): AsyncIterator<string>;
}
export declare function renderToString(node: WarogChild, options?: SsrRenderOptions): string;
export declare function renderToStream(node: WarogChild, options?: SsrRenderOptions): SsrStream;
export declare function createClientOnly<P extends Record<string, unknown>>(component: Component<P>, fallback?: WarogChild, marker?: string): Component<P>;
export declare function createServerOnly<P extends Record<string, unknown>>(component: Component<P>, fallback?: WarogChild): Component<P>;
//# sourceMappingURL=index.d.ts.map