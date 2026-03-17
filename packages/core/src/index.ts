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

type Subscriber = ReactiveComputation<unknown>;
type Dependency = SignalImpl<unknown>;

enum ComputationState {
  Idle = "idle",
  Running = "running",
  Queued = "queued",
  Disposed = "disposed"
}

const MAX_SYNC_FLUSH_ITERATIONS = 10_000;

let activeSubscriber: Subscriber | null = null;
let batchDepth = 0;
let flushDepth = 0;
let isMicrotaskScheduled = false;
const pendingSubscribers: Subscriber[] = [];
const pendingSubscriberSet = new Set<Subscriber>();

function queueMicrotaskSafe(task: () => void): void {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(task);
    return;
  }

  Promise.resolve().then(task);
}

function ensureMicrotaskFlush(): void {
  if (batchDepth > 0 || flushDepth > 0 || isMicrotaskScheduled || pendingSubscribers.length === 0) {
    return;
  }

  isMicrotaskScheduled = true;
  queueMicrotaskSafe(() => {
    isMicrotaskScheduled = false;
    flushPendingSubscribers();
  });
}

function enqueueSubscriber(subscriber: Subscriber): void {
  if (subscriber.isDisposed() || pendingSubscriberSet.has(subscriber)) {
    return;
  }

  pendingSubscriberSet.add(subscriber);
  pendingSubscribers.push(subscriber);
  subscriber.markQueued();
}

function schedule(subscriber: Subscriber): void {
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

function flushPendingSubscribers(): void {
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
        throw new Error(
          `Warog reactive scheduler exceeded ${MAX_SYNC_FLUSH_ITERATIONS} synchronous iterations. ` +
            "This usually indicates a re-entrant update loop."
        );
      }

      subscriber.run();
    }
  } finally {
    flushDepth -= 1;
    if (flushDepth === 0 && batchDepth === 0 && pendingSubscribers.length > 0) {
      ensureMicrotaskFlush();
    }
  }
}

function trackDependency(dependency: Dependency): void {
  if (!activeSubscriber) {
    return;
  }

  dependency.addSubscriber(activeSubscriber);
  activeSubscriber.addDependency(dependency);
}

function cleanupSubscriber(subscriber: Subscriber): void {
  pendingSubscriberSet.delete(subscriber);
}

class ReactiveComputation<T> implements Disposable {
  private readonly dependencies = new Set<Dependency>();
  private readonly owned = new Set<ReactiveComputation<unknown>>();
  private state = ComputationState.Idle;
  private cleanup: Cleanup | undefined;
  private readonly memoized: SignalImpl<T> | undefined;
  private readonly kind: "effect" | "memo";

  constructor(
    private readonly effect: () => T | Cleanup,
    options?: {
      memoized?: SignalImpl<T>;
      kind?: "effect" | "memo";
    }
  ) {
    this.memoized = options?.memoized;
    this.kind = options?.kind ?? "effect";
  }

  addDependency(dependency: Dependency): void {
    this.dependencies.add(dependency);
  }

  isDisposed(): boolean {
    return this.state === ComputationState.Disposed;
  }

  isRunning(): boolean {
    return this.state === ComputationState.Running;
  }

  markQueued(): void {
    if (this.state !== ComputationState.Disposed) {
      this.state = ComputationState.Queued;
    }
  }

  markDequeued(): void {
    if (this.state === ComputationState.Queued) {
      this.state = ComputationState.Idle;
    }
  }

  owns(child: ReactiveComputation<unknown>): void {
    this.owned.add(child);
  }

  run(): void {
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
        this.memoized.write(result as T);
      } else if (typeof result === "function") {
        this.cleanup = result as Cleanup;
      }
    } finally {
      activeSubscriber = previous;
      if (!this.isDisposed()) {
        this.state = ComputationState.Idle;
      }
    }
  }

  dispose(): void {
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

  private disposeOwned(): void {
    for (const owned of this.owned) {
      owned.dispose();
    }
    this.owned.clear();
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
  peek(): T;
  subscribe(listener: () => void): Cleanup;
}

export interface Signal<T> extends ReadonlySignal<T> {
  set(next: T): void;
  update(updater: (current: T) => T): void;
}

class SignalImpl<T> implements Signal<T> {
  private value: T;
  private readonly subscribers = new Set<Subscriber | (() => void)>();

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

  write(next: T): void {
    this.set(next);
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
      flushPendingSubscribers();
      ensureMicrotaskFlush();
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
  const computation = new ReactiveComputation(effect, { kind: "effect" });

  if (activeSubscriber) {
    activeSubscriber.owns(computation);
  }

  computation.run();
  return () => {
    computation.dispose();
  };
}

export function derive<T>(compute: () => T): ReadonlySignal<T> {
  const derived = new SignalImpl<T>(untrack(compute));
  const computation = new ReactiveComputation<T>(compute, { memoized: derived, kind: "memo" });

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

export function getRuntimeSchedulerSnapshot(): RuntimeSchedulerSnapshot {
  return {
    batchDepth,
    pendingEffects: pendingSubscribers.length,
    isFlushingSync: flushDepth > 0,
    isMicrotaskScheduled
  };
}
