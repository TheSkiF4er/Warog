import { type Cleanup } from "@warog/core";
export declare const Fragment: unique symbol;
declare const TEXT_NODE: unique symbol;
declare const ERROR_BOUNDARY_TYPE: unique symbol;
export type WarogChild = WarogVNode<any> | Node | string | number | boolean | null | undefined | (() => WarogChild) | WarogChild[];
export interface RefObject<T> {
    current: T | null;
}
export interface WarogElementProps {
    children?: WarogChild;
    class?: string | (() => string | null | undefined) | null;
    className?: string | (() => string | null | undefined) | null;
    style?: string | Record<string, string | number | null | undefined> | (() => string | Record<string, string | number | null | undefined> | null | undefined) | null;
    ref?: Ref<Element> | null;
    [key: string]: unknown;
}
export interface Context<T> {
    readonly id: symbol;
    readonly defaultValue: T;
    Provider: Component<{
        value: T;
        children?: WarogChild;
    }> & {
        $$typeof: symbol;
        _context: Context<T>;
    };
}
export type Ref<T> = ((value: T | null) => void) | RefObject<T>;
export type Component<P = Record<string, unknown>> = (props: P & {
    children?: WarogChild;
}) => WarogChild;
export interface WarogVNode<P = WarogElementProps> {
    type: string | typeof Fragment | typeof TEXT_NODE | Component<P> | ProviderComponent<unknown> | typeof ERROR_BOUNDARY_TYPE;
    props: P & {
        children?: WarogChild;
    };
    key?: string | number;
}
type ProviderComponent<T> = Component<{
    value: T;
    children?: WarogChild;
}> & {
    $$typeof: symbol;
    _context: Context<T>;
};
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
declare function createRef<T>(): RefObject<T>;
export { createRef };
export declare function createContext<T>(defaultValue: T): Context<T>;
export declare function useContext<T>(context: Context<T>): T;
export declare function ErrorBoundary(props: ErrorBoundaryProps): WarogVNode<ErrorBoundaryProps>;
export declare function mount(target: Element | DocumentFragment, child: WarogChild): Cleanup;
export declare function render(target: Element | DocumentFragment, child: WarogChild): Cleanup;
export declare function hydrate(target: Element | DocumentFragment, child: WarogChild, options?: RenderOptions): Cleanup;
export declare function jsx<P>(type: WarogVNode<P>["type"], props: P & {
    children?: WarogChild;
}, key?: string): WarogVNode<P>;
export declare const jsxs: typeof jsx;
export declare const jsxDEV: typeof jsx;
//# sourceMappingURL=index.d.ts.map