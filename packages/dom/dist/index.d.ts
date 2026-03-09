import { type Cleanup } from "@warog/core";
export declare const Fragment: unique symbol;
export type WarogChild = WarogVNode | Node | string | number | boolean | null | undefined | (() => WarogChild) | WarogChild[];
export interface WarogElementProps {
    children?: WarogChild;
    class?: string | (() => string | null | undefined) | null;
    className?: string | (() => string | null | undefined) | null;
    style?: string | Record<string, string | number | null | undefined> | (() => string | Record<string, string | number | null | undefined> | null | undefined) | null;
    ref?: ((node: Element) => void) | null;
    [key: string]: unknown;
}
export interface WarogVNode<P = WarogElementProps> {
    type: string | typeof Fragment | Component<P>;
    props: P & {
        children?: WarogChild;
    };
    key?: string | number;
}
export type Component<P = Record<string, unknown>> = (props: P & {
    children?: WarogChild;
}) => WarogChild;
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
export declare function mount(target: Element | DocumentFragment, child: WarogChild): Cleanup;
export declare function render(target: Element | DocumentFragment, child: WarogChild): Cleanup;
export declare function hydrate(target: Element | DocumentFragment, child: WarogChild): Cleanup;
export declare function jsx<P>(type: WarogVNode<P>["type"], props: P & {
    children?: WarogChild;
}, key?: string): WarogVNode<P>;
export declare const jsxs: typeof jsx;
export declare const jsxDEV: typeof jsx;
//# sourceMappingURL=index.d.ts.map