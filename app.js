// app.js：渲染结果
import { blame } from "./blame.js";
import { incremental } from "./moves.js";

export function render(spec) {
  const base = blame(spec.commits, spec.file_lines);
  const moves = spec.moves || [];
  const grown = incremental(spec.commits, spec.file_lines, moves, spec.from || 0);
  const full = incremental(spec.commits, spec.file_lines, moves, 0);
  const same = JSON.stringify(grown.owner) === JSON.stringify(full.owner);
  return { owner: base.owner, unknown: base.unknown, moved: grown.moved,
           reblamed: grown.reblamed, consistent: same, budget_used: grown.reblamed.length };
}
