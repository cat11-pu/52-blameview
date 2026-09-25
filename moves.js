// moves.js：移动检测与增量重算（只对受影响行推进，不重扫全部历史）
import { blame } from "./blame.js";

function unknownCommit(message) {
  const error = new Error(message);
  error.code = "E_UNKNOWN_COMMIT";
  return error;
}

export function incremental(commits, fileLines, knownMoves, from) {
  const start = Math.max(0, Math.min(from || 0, commits.length));
  const baseLines = start > 0 && Array.isArray(commits[start - 1].lines) ? commits[start - 1].lines : [];
  const baseOwner = blame(commits.slice(0, start), baseLines).owner;
  const ids = new Set(commits.map((commit) => commit && commit.id));

  // 移动检测：区间为半开 [start, end)，源区间相对基线版本、目标区间相对最终内容
  const moved = [];
  const inherits = [];
  for (const move of knownMoves || []) {
    if (!move || !Array.isArray(move.from) || !Array.isArray(move.to)) {
      throw unknownCommit("malformed move range");
    }
    if (move.commit !== undefined && !ids.has(move.commit)) {
      throw unknownCommit("move references unknown commit " + move.commit);
    }
    const s0 = move.from[0], s1 = move.from[1], t0 = move.to[0], t1 = move.to[1];
    if (![s0, s1, t0, t1].every(Number.isInteger) ||
        s0 < 0 || t0 < 0 || s0 > s1 || t0 > t1 ||
        s1 > baseLines.length || t1 > fileLines.length) {
      throw unknownCommit("move range out of bounds");
    }
    let same = s1 - s0 === t1 - t0;
    for (let k = 0; same && k < s1 - s0; k++) {
      if (baseLines[s0 + k] !== fileLines[t0 + k]) same = false;
    }
    if (same && s1 > s0) {
      moved.push([t0, t1]);
      inherits.push([t0, t1, s0]);
    }
  }

  // 受影响行：from 之后任意相邻版本发生过变化的行（改了又改回也算），
  // 加上最终内容与末版不同的行、移动目标行（重算预算只覆盖这些行）
  const affected = new Set();
  let scan = baseLines;
  for (let c = start; c < commits.length; c++) {
    const lines = Array.isArray(commits[c].lines) ? commits[c].lines : [];
    const wide = Math.max(scan.length, lines.length);
    for (let i = 0; i < wide; i++) {
      if (scan[i] !== lines[i]) affected.add(i);
    }
    scan = lines;
  }
  const tail = Math.max(scan.length, fileLines.length);
  for (let i = 0; i < tail; i++) {
    if (scan[i] !== fileLines[i]) affected.add(i);
  }
  for (const range of moved) {
    for (let i = range[0]; i < range[1]; i++) affected.add(i);
  }
  const reblamed = Array.from(affected).sort((a, b) => a - b);

  // 未受影响的行沿用基线归属；受影响行从 from 起逐提交推进一次
  const owner = {};
  for (let i = 0; i < fileLines.length; i++) {
    owner[i] = baseOwner[i] !== undefined ? baseOwner[i] : null;
  }
  const current = {};
  for (const i of reblamed) current[i] = baseOwner[i];
  let prev = baseLines;
  for (let c = start; c < commits.length; c++) {
    const lines = Array.isArray(commits[c].lines) ? commits[c].lines : [];
    for (const i of reblamed) {
      if (i < lines.length && (i >= prev.length || prev[i] !== lines[i])) current[i] = commits[c].id;
    }
    prev = lines;
  }
  for (const i of reblamed) {
    owner[i] = i < prev.length && prev[i] === fileLines[i] && current[i] !== undefined ? current[i] : null;
  }

  // 移动目标行沿用源行归属（不得算成新写）；快照保证交换类移动一致
  const snapshot = Object.assign({}, owner);
  for (const range of inherits) {
    for (let k = 0; k < range[1] - range[0]; k++) {
      const inherited = snapshot[range[2] + k];
      if (inherited !== undefined && inherited !== null) owner[range[0] + k] = inherited;
    }
  }

  return { owner: owner, moved: moved, reblamed: reblamed };
}
