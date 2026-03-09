import test from "node:test";
import assert from "node:assert/strict";
import { Fragment, jsx, jsxs } from "./index.js";
test("jsx creates a vnode", () => {
    const node = jsx("div", { id: "app", children: "hello" });
    assert.equal(node.type, "div");
    assert.deepEqual(node.props, { id: "app", children: "hello" });
});
test("jsxs supports fragments", () => {
    const node = jsxs(Fragment, { children: ["a", "b"] });
    assert.equal(node.type, Fragment);
    assert.deepEqual(node.props.children, ["a", "b"]);
});
//# sourceMappingURL=index.test.js.map