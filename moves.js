// moves.js：移动检测与增量重算。
// 与 blame 同一套逐提交推进引擎：from 之前视为已缓存的前缀状态，窗口内只重算
// 受影响的行（reblamed）。knownMoves 里的移动锚定到指定提交（缺省为最后一个提交）：
// 源区间取自该提交之前一版，目标区间取自该提交本身；内容一致时目标行沿用源行归属
// （不算新写）。区间越界或引用不到提交时抛 E_UNKNOWN_COMMIT，不静默忽略。
export const E_UNKNOWN_COMMIT = "E_UNKNOWN_COMMIT";

function unknownCommit(message) {
  const error = new Error(E_UNKNOWN_COMMIT + ": " + message);
  error.code = E_UNKNOWN_COMMIT;
  return error;
}

export function incremental(commits, fileLines, knownMoves, from) {
  const start = Math.max(0, Math.min(from == null ? 0 : from, commits.length));
  const indexById = new Map();
  commits.forEach((commit, index) => {
    if (commit && commit.id != null) indexById.set(commit.id, index);
  });
  const movesByCommit = new Map();
  (knownMoves || []).forEach((move) => {
    if (!move || !Array.isArray(move.from) || !Array.isArray(move.to) ||
        move.from.length !== 2 || move.to.length !== 2) {
      throw unknownCommit("move range malformed");
    }
    let anchor = commits.length - 1;
    if (move.commit != null) {
      if (!indexById.has(move.commit)) {
        throw unknownCommit("move references unknown commit " + move.commit);
      }
      anchor = indexById.get(move.commit);
    }
    if (anchor < 0) throw unknownCommit("no commit to anchor move");
    if (!movesByCommit.has(anchor)) movesByCommit.set(anchor, []);
    movesByCommit.get(anchor).push(move);
  });

  let prevLines = [];
  let prevOwner = [];
  const affected = new Set();
  const moved = [];

  commits.forEach((commit, index) => {
    if (!commit || commit.id == null || !Array.isArray(commit.lines)) return;
    const lines = commit.lines;
    const owner = new Array(lines.length);
    for (let i = 0; i < lines.length; i++) {
      const same = i < prevLines.length && prevLines[i] === lines[i];
      owner[i] = same ? prevOwner[i] : commit.id;
      if (!same && index >= start) affected.add(i);
    }
    const moves = movesByCommit.get(index) || [];
    for (const move of moves) {
      const fs = move.from[0];
      const fe = move.from[1];
      const ts = move.to[0];
      const te = move.to[1];
      if (!Number.isInteger(fs) || !Number.isInteger(fe) ||
          !Number.isInteger(ts) || !Number.isInteger(te) ||
          fs < 0 || fe < fs || fe > prevLines.length ||
          ts < 0 || te < ts || te > lines.length) {
        throw unknownCommit("move range out of bounds");
      }
      if (fe - fs !== te - ts || fe === fs) continue;
      let equal = true;
      for (let k = 0; k < fe - fs; k++) {
        if (prevLines[fs + k] !== lines[ts + k]) { equal = false; break; }
      }
      if (!equal) continue;
      moved.push([ts, te]);
      for (let k = 0; k < te - ts; k++) {
        owner[ts + k] = prevOwner[fs + k];
        if (index >= start) affected.add(ts + k);
      }
    }
    prevLines = lines;
    prevOwner = owner;
  });

  const owner = {};
  fileLines.forEach((line, index) => {
    if (index < prevLines.length && prevLines[index] === line) {
      owner[index] = prevOwner[index];
    } else {
      owner[index] = null;
      if (commits.length) affected.add(index);
    }
  });
  const reblamed = Array.from(affected)
    .filter((index) => index >= 0 && index < fileLines.length)
    .sort((a, b) => a - b);
  return { owner: owner, moved: moved, reblamed: reblamed };
}
