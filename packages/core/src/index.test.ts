import test from "node:test";
import assert from "node:assert/strict";

import {
  batch,
  derive,
  getRuntimeSchedulerSnapshot,
  signal,
  untrack,
  watch
} from "./index.js";

test("signal get/set works", () => {
  const count = signal(1);
  count.set(2);
  assert.equal(count.get(), 2);
  assert.equal(count.peek(), 2);
});

test("derive recalculates when source changes", () => {
  const count = signal(2);
  const doubled = derive(() => count.get() * 2);

  assert.equal(doubled.get(), 4);
  count.set(5);
  assert.equal(doubled.get(), 10);
  assert.equal(doubled.peek(), 10);
});

test("watch reacts to updates", () => {
  const count = signal(0);
  const seen: number[] = [];

  watch(() => {
    seen.push(count.get());
  });

  count.set(1);
  count.set(2);

  assert.deepEqual(seen, [0, 1, 2]);
});

test("batch flushes once after multiple updates", () => {
  const count = signal(0);
  const seen: number[] = [];

  watch(() => {
    seen.push(count.get());
  });

  batch(() => {
    count.set(1);
    count.set(2);
    count.set(3);
  });

  assert.deepEqual(seen, [0, 3]);
});

test("watch cleanup runs between executions and on dispose", () => {
  const toggle = signal(true);
  const calls: string[] = [];

  const stop = watch(() => {
    calls.push(`run:${toggle.get()}`);
    return () => {
      calls.push(`cleanup:${toggle.peek()}`);
    };
  });

  toggle.set(false);
  stop();

  assert.deepEqual(calls, [
    "run:true",
    "cleanup:false",
    "run:false",
    "cleanup:false"
  ]);
});

test("dynamic dependencies are re-tracked correctly", () => {
  const selector = signal<"a" | "b">("a");
  const a = signal(1);
  const b = signal(10);
  const seen: number[] = [];

  watch(() => {
    seen.push(selector.get() === "a" ? a.get() : b.get());
  });

  a.set(2);
  selector.set("b");
  a.set(3);
  b.set(11);

  assert.deepEqual(seen, [1, 2, 10, 11]);
});

test("untrack reads without creating dependencies", () => {
  const tracked = signal(1);
  const untrackedSource = signal(5);
  const seen: number[] = [];

  watch(() => {
    seen.push(tracked.get() + untrack(() => untrackedSource.get()));
  });

  untrackedSource.set(6);
  tracked.set(2);

  assert.deepEqual(seen, [6, 8]);
});

test("nested effects are disposed with their parent", () => {
  const outer = signal(0);
  const inner = signal(0);
  const events: string[] = [];

  const stop = watch(() => {
    events.push(`outer:${outer.get()}`);
    watch(() => {
      events.push(`inner:${inner.get()}`);
      return () => {
        events.push(`inner-cleanup:${inner.peek()}`);
      };
    });
  });

  inner.set(1);
  outer.set(1);
  inner.set(2);
  stop();
  inner.set(3);

  assert.equal(events[0], "outer:0");
  assert.equal(events[1], "inner:0");
  assert.equal(events.includes("outer:1"), true);
  assert.equal(events.includes("inner-cleanup:1"), true);
  assert.equal(events.includes("inner-cleanup:2"), true);
  assert.equal(events.includes("inner:3"), false);
});

test("cascading updates settle in dependency order", () => {
  const a = signal(1);
  const b = signal(0);
  const seen: string[] = [];

  watch(() => {
    const next = a.get() * 10;
    b.set(next);
    seen.push(`derive:${next}`);
  });

  watch(() => {
    seen.push(`consume:${b.get()}`);
  });

  a.set(2);

  assert.deepEqual(seen, ["derive:10", "consume:10", "derive:20", "consume:20"]);
});

test("disposal removes stale dependencies", () => {
  const toggle = signal(true);
  const left = signal(1);
  const right = signal(10);
  const seen: number[] = [];

  const stop = watch(() => {
    seen.push(toggle.get() ? left.get() : right.get());
  });

  toggle.set(false);
  left.set(2);
  right.set(11);
  stop();
  right.set(12);

  assert.deepEqual(seen, [1, 10, 11]);
});

test("re-entrant mutation is deferred to a microtask", async () => {
  const value = signal(0);
  const seen: number[] = [];

  watch(() => {
    const current = value.get();
    seen.push(current);
    if (current < 2) {
      value.set(current + 1);
    }
  });

  assert.deepEqual(seen, [0]);
  assert.equal(getRuntimeSchedulerSnapshot().isMicrotaskScheduled, true);

  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(seen, [0, 1, 2]);
  assert.equal(getRuntimeSchedulerSnapshot().pendingEffects, 0);
});

test("subscription cleanup can be called more than once safely", () => {
  const source = signal(1);
  let calls = 0;
  const stop = watch(() => {
    calls += source.get();
  });

  stop();
  stop();
  source.set(2);

  assert.equal(calls, 1);
});
