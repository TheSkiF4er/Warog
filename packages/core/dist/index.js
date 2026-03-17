var ComputationState;
(function (ComputationState) {
    ComputationState["Idle"] = "idle";
    ComputationState["Running"] = "running";
    ComputationState["Queued"] = "queued";
    ComputationState["Disposed"] = "disposed";
})(ComputationState || (ComputationState = {}));
const MAX_SYNC_FLUSH_ITERATIONS = 10_000;
let activeSubscriber = null;
let batchDepth = 0;
let flushDepth = 0;
let isMicrotaskScheduled = false;
const pendingSubscribers = [];
const pendingSubscriberSet = new Set();
function queueMicrotaskSafe(task) {
    if (typeof queueMicrotask === "function") {
        queueMicrotask(task);
        return;
    }
    Promise.resolve().then(task);
}
function ensureMicrotaskFlush() {
    if (batchDepth > 0 || flushDepth > 0 || isMicrotaskScheduled || pendingSubscribers.length === 0) {
        return;
    }
    isMicrotaskScheduled = true;
    queueMicrotaskSafe(() => {
        isMicrotaskScheduled = false;
        flushPendingSubscribers();
    });
}
function enqueueSubscriber(subscriber) {
    if (subscriber.isDisposed() || pendingSubscriberSet.has(subscriber)) {
        return;
    }
    pendingSubscriberSet.add(subscriber);
    pendingSubscribers.push(subscriber);
    subscriber.markQueued();
}
function schedule(subscriber) {
    const wasRunning = subscriber.isRunning();
    enqueueSubscriber(subscriber);
    if (wasRunning) {
        ensureMicrotaskFlush();
        return;
    }
    if (batchDepth > 0) {
        return;
    }
    if (flushDepth > 0) {
        ensureMicrotaskFlush();
        return;
    }
    flushPendingSubscribers();
}
function flushPendingSubscribers() {
    if (flushDepth > 0 || pendingSubscribers.length === 0) {
        return;
    }
    flushDepth += 1;
    let iterations = 0;
    try {
        while (pendingSubscribers.length > 0) {
            const subscriber = pendingSubscribers.shift();
            if (!subscriber) {
                continue;
            }
            pendingSubscriberSet.delete(subscriber);
            subscriber.markDequeued();
            if (subscriber.isDisposed()) {
                continue;
            }
            iterations += 1;
            if (iterations > MAX_SYNC_FLUSH_ITERATIONS) {
                throw new Error(`Warog reactive scheduler exceeded ${MAX_SYNC_FLUSH_ITERATIONS} synchronous iterations. ` +
                    "This usually indicates a re-entrant update loop.");
            }
            subscriber.run();
        }
    }
    finally {
        flushDepth -= 1;
        if (flushDepth === 0 && batchDepth === 0 && pendingSubscribers.length > 0) {
            ensureMicrotaskFlush();
        }
    }
}
function trackDependency(dependency) {
    if (!activeSubscriber) {
        return;
    }
    dependency.addSubscriber(activeSubscriber);
    activeSubscriber.addDependency(dependency);
}
function cleanupSubscriber(subscriber) {
    pendingSubscriberSet.delete(subscriber);
}
class ReactiveComputation {
    effect;
    dependencies = new Set();
    owned = new Set();
    state = ComputationState.Idle;
    cleanup;
    memoized;
    kind;
    constructor(effect, options) {
        this.effect = effect;
        this.memoized = options?.memoized;
        this.kind = options?.kind ?? "effect";
    }
    addDependency(dependency) {
        this.dependencies.add(dependency);
    }
    isDisposed() {
        return this.state === ComputationState.Disposed;
    }
    isRunning() {
        return this.state === ComputationState.Running;
    }
    markQueued() {
        if (this.state !== ComputationState.Disposed) {
            this.state = ComputationState.Queued;
        }
    }
    markDequeued() {
        if (this.state === ComputationState.Queued) {
            this.state = ComputationState.Idle;
        }
    }
    owns(child) {
        this.owned.add(child);
    }
    run() {
        if (this.state === ComputationState.Disposed || this.state === ComputationState.Running) {
            return;
        }
        this.disposeOwned();
        this.teardownDependencies();
        this.cleanup?.();
        this.cleanup = undefined;
        const previous = activeSubscriber;
        activeSubscriber = this;
        this.state = ComputationState.Running;
        try {
            const result = this.effect();
            if (this.memoized) {
                this.memoized.write(result);
            }
            else if (typeof result === "function") {
                this.cleanup = result;
            }
        }
        finally {
            activeSubscriber = previous;
            if (!this.isDisposed()) {
                this.state = ComputationState.Idle;
            }
        }
    }
    dispose() {
        if (this.state === ComputationState.Disposed) {
            return;
        }
        this.state = ComputationState.Disposed;
        cleanupSubscriber(this);
        this.disposeOwned();
        this.teardownDependencies();
        this.cleanup?.();
        this.cleanup = undefined;
    }
    disposeOwned() {
        for (const owned of this.owned) {
            owned.dispose();
        }
        this.owned.clear();
    }
    teardownDependencies() {
        for (const dependency of this.dependencies) {
            dependency.removeSubscriber(this);
        }
        this.dependencies.clear();
    }
}
class SignalImpl {
    value;
    subscribers = new Set();
    constructor(initial) {
        this.value = initial;
    }
    get() {
        trackDependency(this);
        return this.value;
    }
    peek() {
        return this.value;
    }
    set(next) {
        if (Object.is(this.value, next)) {
            return;
        }
        this.value = next;
        this.notify();
    }
    write(next) {
        this.set(next);
    }
    update(updater) {
        this.set(updater(this.value));
    }
    subscribe(listener) {
        this.subscribers.add(listener);
        return () => {
            this.subscribers.delete(listener);
        };
    }
    addSubscriber(subscriber) {
        this.subscribers.add(subscriber);
    }
    removeSubscriber(subscriber) {
        this.subscribers.delete(subscriber);
    }
    notify() {
        const subscribers = [...this.subscribers];
        for (const subscriber of subscribers) {
            if (subscriber instanceof ReactiveComputation) {
                schedule(subscriber);
            }
            else {
                subscriber();
            }
        }
    }
}
export function signal(initial) {
    return new SignalImpl(initial);
}
export function batch(fn) {
    batchDepth += 1;
    try {
        return fn();
    }
    finally {
        batchDepth -= 1;
        if (batchDepth === 0) {
            flushPendingSubscribers();
            ensureMicrotaskFlush();
        }
    }
}
export function untrack(fn) {
    const previous = activeSubscriber;
    activeSubscriber = null;
    try {
        return fn();
    }
    finally {
        activeSubscriber = previous;
    }
}
export function watch(effect) {
    const computation = new ReactiveComputation(effect, { kind: "effect" });
    if (activeSubscriber) {
        activeSubscriber.owns(computation);
    }
    computation.run();
    return () => {
        computation.dispose();
    };
}
export function derive(compute) {
    const derived = new SignalImpl(untrack(compute));
    const computation = new ReactiveComputation(compute, { memoized: derived, kind: "memo" });
    if (activeSubscriber) {
        activeSubscriber.owns(computation);
    }
    computation.run();
    return {
        get: () => derived.get(),
        peek: () => derived.peek(),
        subscribe: (listener) => derived.subscribe(listener)
    };
}
export function getRuntimeSchedulerSnapshot() {
    return {
        batchDepth,
        pendingEffects: pendingSubscribers.length,
        isFlushingSync: flushDepth > 0,
        isMicrotaskScheduled
    };
}
//# sourceMappingURL=index.js.map