import test from "node:test";
import assert from "node:assert/strict";
import { batch, derive, signal, untrack, watch } from "./index.js";
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
});
test("watch reacts to updates", () => {
    const count = signal(0);
    const seen = [];
    watch(() => {
        seen.push(count.get());
    });
    count.set(1);
    count.set(2);
    assert.deepEqual(seen, [0, 1, 2]);
});
test("batch flushes once after multiple updates", () => {
    const count = signal(0);
    const seen = [];
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
    const calls = [];
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
    const selector = signal("a");
    const a = signal(1);
    const b = signal(10);
    const seen = [];
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
    const seen = [];
    watch(() => {
        seen.push(tracked.get() + untrack(() => untrackedSource.get()));
    });
    untrackedSource.set(6);
    tracked.set(2);
    assert.deepEqual(seen, [6, 8]);
});
//# sourceMappingURL=index.test.js.map