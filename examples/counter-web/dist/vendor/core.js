let activeSubscriber = null;
let batchDepth = 0;
const pendingSubscribers = new Set();
function flush() {
    while (pendingSubscribers.size > 0) {
        const queue = [...pendingSubscribers];
        pendingSubscribers.clear();
        for (const subscriber of queue) {
            subscriber.run();
        }
    }
}
function schedule(subscriber) {
    pendingSubscribers.add(subscriber);
    if (batchDepth === 0) {
        flush();
    }
}
function trackDependency(dependency) {
    if (!activeSubscriber) {
        return;
    }
    dependency.addSubscriber(activeSubscriber);
    activeSubscriber.dependencies.add(dependency);
}
class ReactiveComputation {
    effect;
    dependencies = new Set();
    disposed = false;
    cleanup;
    constructor(effect) {
        this.effect = effect;
    }
    run() {
        if (this.disposed) {
            return;
        }
        this.teardownDependencies();
        this.cleanup?.();
        this.cleanup = undefined;
        const previous = activeSubscriber;
        activeSubscriber = this;
        try {
            const maybeCleanup = this.effect();
            if (typeof maybeCleanup === "function") {
                this.cleanup = maybeCleanup;
            }
        }
        finally {
            activeSubscriber = previous;
        }
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.teardownDependencies();
        this.cleanup?.();
        this.cleanup = undefined;
        pendingSubscribers.delete(this);
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
            flush();
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
    const computation = new ReactiveComputation(effect);
    computation.run();
    return () => {
        computation.dispose();
    };
}
export function derive(compute) {
    const derived = signal(untrack(compute));
    const stop = watch(() => {
        derived.set(compute());
    });
    return {
        get: () => derived.get(),
        subscribe: (listener) => {
            const unsubscribe = derived.subscribe(listener);
            return () => {
                unsubscribe();
            };
        }
    };
}
//# sourceMappingURL=index.js.map