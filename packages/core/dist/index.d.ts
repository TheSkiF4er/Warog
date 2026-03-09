export type Cleanup = () => void;
export interface ReadonlySignal<T> {
    get(): T;
    subscribe(listener: () => void): Cleanup;
}
export interface Signal<T> extends ReadonlySignal<T> {
    set(next: T): void;
    update(updater: (current: T) => T): void;
    peek(): T;
}
export declare function signal<T>(initial: T): Signal<T>;
export declare function batch<T>(fn: () => T): T;
export declare function untrack<T>(fn: () => T): T;
export declare function watch(effect: () => void | Cleanup): Cleanup;
export declare function derive<T>(compute: () => T): ReadonlySignal<T>;
//# sourceMappingURL=index.d.ts.map