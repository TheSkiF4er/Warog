import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./index.js";
test("compile returns unchanged code for now", () => {
    const result = compile("component App() {}\n", { filename: "App.warog" });
    assert.match(result.warnings[0], /not required|unchanged/i);
    assert.match(result.warnings[0], /App\.warog/);
    assert.equal(result.code, "component App() {}\n");
});
//# sourceMappingURL=index.test.js.map