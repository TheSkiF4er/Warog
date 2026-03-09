export type Cleanup = () => void;

type Subscriber = ReactiveComputation;
type Dependency = SignalImpl<unknown>;

let activeSubscriber: Subscriber | null = null;
let batchDepth = 0;
const pendingSubscribers = new Set<Subscriber>();

function flush(): void {
  while (pendingSubscribers.size > 0) {
    const queue = [...pendingSubscribers];
    pendingSubscribers.clear();

    for (const subscriber of queue) {
      subscriber.run();
    }
  }
}

function schedule(subscriber: Subscriber): void {
  pendingSubscribers.add(subscriber);

  if (batchDepth === 0) {
    flush();
  }
}

function trackDependency(dependency: Dependency): void {
  if (!activeSubscriber) {
    return;
  }

  dependency.addSubscriber(activeSubscriber);
  activeSubscriber.dependencies.add(dependency);
}

class ReactiveComputation {
  readonly dependencies = new Set<Dependency>();
  private disposed = false;
  private cleanup: Cleanup | undefined;

  constructor(private readonly effect: () => void | Cleanup) {}

  run(): void {
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
    } finally {
      activeSubscriber = previous;
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.teardownDependencies();
    this.cleanup?.();
    this.cleanup = undefined;
    pendingSubscribers.delete(this);
  }

  private teardownDependencies(): void {
    for (const dependency of this.dependencies) {
      dependency.removeSubscriber(this);
    }

    this.dependencies.clear();
  }
}

export interface ReadonlySignal<T> {
  get(): T;
  subscribe(listener: () => void): Cleanup;
}

export interface Signal<T> extends ReadonlySignal<T> {
  set(next: T): void;
  update(updater: (current: T) => T): void;
  peek(): T;
}

class SignalImpl<T> implements Signal<T> {
  private value: T;
  private subscribers = new Set<Subscriber | (() => void)>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    trackDependency(this as SignalImpl<unknown>);
    return this.value;
  }

  peek(): T {
    return this.value;
  }

  set(next: T): void {
    if (Object.is(this.value, next)) {
      return;
    }

    this.value = next;
    this.notify();
  }

  update(updater: (current: T) => T): void {
    this.set(updater(this.value));
  }

  subscribe(listener: () => void): Cleanup {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  addSubscriber(subscriber: Subscriber): void {
    this.subscribers.add(subscriber);
  }

  removeSubscriber(subscriber: Subscriber): void {
    this.subscribers.delete(subscriber);
  }

  private notify(): void {
    const subscribers = [...this.subscribers];

    for (const subscriber of subscribers) {
      if (subscriber instanceof ReactiveComputation) {
        schedule(subscriber);
      } else {
        subscriber();
      }
    }
  }
}

export function signal<T>(initial: T): Signal<T> {
  return new SignalImpl(initial);
}

export function batch<T>(fn: () => T): T {
  batchDepth += 1;
  try {
    return fn();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0) {
      flush();
    }
  }
}

export function untrack<T>(fn: () => T): T {
  const previous = activeSubscriber;
  activeSubscriber = null;
  try {
    return fn();
  } finally {
    activeSubscriber = previous;
  }
}

export function watch(effect: () => void | Cleanup): Cleanup {
  const computation = new ReactiveComputation(effect);
  computation.run();
  return () => {
    computation.dispose();
  };
}

export function derive<T>(compute: () => T): ReadonlySignal<T> {
  const derived = signal<T>(untrack(compute));
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
