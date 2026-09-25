import assert from "node:assert";
import { blame } from "../blame.js";
import { incremental } from "../moves.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const commits = [{ id: "c0", lines: ["a"] }];

check("blame returns owner map", () => {
  assert.strictEqual(typeof blame(commits, ["a"]).owner, "object");
});

check("blame reports unknown", () => {
  assert.ok(Array.isArray(blame(commits, ["a"]).unknown));
});

check("incremental returns moved list", () => {
  assert.ok(Array.isArray(incremental(commits, ["a"], [], 0).moved));
});

check("incremental returns reblamed list", () => {
  assert.ok(Array.isArray(incremental(commits, ["a"], [], 0).reblamed));
});

check("render exposes consistent flag", () => {
  assert.strictEqual(typeof render({ commits: commits, file_lines: ["a"], moves: [], from: 0 }).consistent, "boolean");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
