export type Cleanup = () => void;
export type Stop = Cleanup;
export interface Disposable {
    dispose(): void;
}
export interface RuntimeSchedulerSnapshot {
    readonly batchDepth: number;
    readonly pendingEffects: number;
    readonly isFlushingSync: boolean;
    readonly isMicrotaskScheduled: boolean;
}
export interface ReadonlySignal<T> {
    get(): T;
    peek(): T;
    subscribe(listener: () => void): Cleanup;
}
export interface Signal<T> extends ReadonlySignal<T> {
    set(next: T): void;
    update(updater: (current: T) => T): void;
}
export declare function signal<T>(initial: T): Signal<T>;
export declare function batch<T>(fn: () => T): T;
export declare function untrack<T>(fn: () => T): T;
export declare function watch(effect: () => void | Cleanup): Cleanup;
export declare function derive<T>(compute: () => T): ReadonlySignal<T>;
export declare function getRuntimeSchedulerSnapshot(): RuntimeSchedulerSnapshot;
//# sourceMappingURL=index.d.ts.map