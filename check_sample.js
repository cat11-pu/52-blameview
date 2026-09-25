import fs from "node:fs";
import { blame } from "./blame.js";
import { incremental } from "./moves.js";
import { render } from "./app.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/blame.json", "utf8"));
const base = blame(spec.commits, spec.file_lines);
const grown = incremental(spec.commits, spec.file_lines, spec.moves || [], spec.from || 0);
const view = render(spec);

emit("每行的归属 =", base.owner);
emit("认不出的提交 =", base.unknown);
emit("检测到的移动区间 =", grown.moved);
emit("需要重算的行 =", grown.reblamed);
emit("增量是否与全量一致 =", view.consistent);
emit("预算消耗 =", view.budget_used);
emit("未知提交的错误码 =", spec.unknown_code);


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "每行的归属": {
    "0": "c0",
    "1": "c3",
    "2": "c3",
    "3": "c3"
  },
  "认不出的提交": [],
  "检测到的移动区间": [
    [
      1,
      2
    ],
    [
      2,
      3
    ]
  ],
  "需要重算的行": [
    1,
    2,
    3
  ],
  "增量是否与全量一致": true,
  "预算消耗": 3,
  "未知提交的错误码": "E_UNKNOWN_COMMIT"
};
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (JSON.stringify(got) === JSON.stringify(want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
